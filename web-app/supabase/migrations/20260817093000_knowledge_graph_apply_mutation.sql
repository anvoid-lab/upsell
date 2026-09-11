-- Fase 3B: aplicação de uma KnowledgeGraphMutation (docs/07 §3, docs/02 §7).
--
-- Precisa de ser uma RPC, e não escritas PostgREST, por duas razões independentes:
--
--   1. Uma mutação toca em `knowledge_graph_nodes` + `knowledge_graph_facts` (+ `knowledge_graph_edges` num `link`) e tem de
--      ser tudo-ou-nada. O PostgREST não expressa transação multi-tabela.
--   2. O compare-and-swap por `expected_version` tem de ser uma única instrução para
--      ser livre de corridas — mesma razão que levou `claim_outbox_events` a existir
--      (migration 20260816131000).
--
-- Convenção: `expected_version = 0` significa "o nó ainda não existe". É o que permite
-- ao chamador exprimir criação e actualização com o mesmo contrato, sem um `exists`
-- prévio que seria, ele próprio, uma corrida.

create or replace function knowledge_graph_apply_mutation(
  p_tenant_id text,
  p_operation text,
  p_entity_type text,
  p_entity_id text,
  p_expected_version int,
  p_resolved jsonb,
  p_facts jsonb default '[]'::jsonb,
  p_edge jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_node knowledge_graph_nodes%rowtype;
  v_fact jsonb;
  v_blocked jsonb := '[]'::jsonb;
  v_from_key bigint;
  v_to_key bigint;
  v_inserted int := 0;
begin
  if p_operation not in ('upsert', 'merge', 'link', 'archive') then
    raise exception 'unknown operation %', p_operation using errcode = '22023';
  end if;

  -- ---------------------------------------------------------------- criação
  if p_expected_version = 0 then
    insert into knowledge_graph_nodes (tenant_id, entity_type, entity_id, version, resolved)
    values (p_tenant_id, p_entity_type, p_entity_id, 1, coalesce(p_resolved, '{}'::jsonb))
    on conflict (tenant_id, entity_type, entity_id) do nothing
    returning * into v_node;

    -- Conflito no insert = o nó já existe. Isto é o CAS a falhar, não um erro de
    -- programação: dois consumers a criar a mesma entidade em paralelo é normal, e
    -- quem perder deve reler a versão e voltar a tentar.
    if v_node.node_key is null then
      return jsonb_build_object(
        'applied', false,
        'reason', 'version_conflict',
        'current_version', (
          select version from knowledge_graph_nodes
          where tenant_id = p_tenant_id and entity_type = p_entity_type and entity_id = p_entity_id
        )
      );
    end if;

  -- ------------------------------------------------------------ actualização
  else
    -- O CAS: uma instrução, sem lock explícito, sem roundtrip extra. Zero linhas
    -- afectadas é o conflito de concorrência.
    update knowledge_graph_nodes
    set version = version + 1,
        resolved = coalesce(p_resolved, resolved),
        archived_at = case when p_operation = 'archive' then now() else archived_at end,
        updated_at = now()
    where tenant_id = p_tenant_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
      and version = p_expected_version
    returning * into v_node;

    if v_node.node_key is null then
      return jsonb_build_object(
        'applied', false,
        'reason', 'version_conflict',
        'current_version', (
          select version from knowledge_graph_nodes
          where tenant_id = p_tenant_id and entity_type = p_entity_type and entity_id = p_entity_id
        )
      );
    end if;
  end if;

  -- ------------------------------------------------------------------ factos
  for v_fact in select * from jsonb_array_elements(coalesce(p_facts, '[]'::jsonb))
  loop
    -- A GUARDA. docs/02 §6: um facto llm_inferred nunca sobrescreve um facto de
    -- system_of_record. A precedência em Python já decide isto antes de chegar aqui —
    -- esta verificação existe porque uma regra que só vive na aplicação é uma
    -- promessa, não uma garantia. Um chamador com credenciais válidas e um bug (ou
    -- uma inferência a fazer-se passar por autoridade) é recusado pela base de dados.
    --
    -- Note-se que o facto NÃO é descartado por ser inferido: é recusada apenas a sua
    -- promoção sobre uma fonte de autoridade superior. Continua a poder ser guardado
    -- como claim quando não colide com nenhuma.
    if v_fact->>'source_type' = 'llm_inferred' and exists (
      select 1 from knowledge_graph_facts f
      where f.tenant_id = p_tenant_id
        and f.entity_type = p_entity_type
        and f.entity_id = p_entity_id
        and f.attribute = v_fact->>'attribute'
        and f.source_type = 'system_of_record'
        and f.superseded_by is null
    ) then
      v_blocked := v_blocked || jsonb_build_array(v_fact->>'attribute');
      continue;
    end if;

    insert into knowledge_graph_facts (
      tenant_id, entity_type, entity_id, attribute, value,
      source, source_type, retrieved_at, confidence, conflict
    )
    values (
      p_tenant_id, p_entity_type, p_entity_id,
      v_fact->>'attribute', v_fact->'value',
      v_fact->>'source', v_fact->>'source_type',
      (v_fact->>'retrieved_at')::timestamptz,
      nullif(v_fact->>'confidence', '')::numeric,
      coalesce((v_fact->>'conflict')::boolean, false)
    );
    v_inserted := v_inserted + 1;
  end loop;

  -- ------------------------------------------------------------------ arestas
  if p_operation = 'link' and p_edge is not null then
    select node_key into v_from_key from knowledge_graph_nodes
    where tenant_id = p_tenant_id
      and entity_type = p_edge->>'from_type'
      and entity_id = p_edge->>'from_id';

    select node_key into v_to_key from knowledge_graph_nodes
    where tenant_id = p_tenant_id
      and entity_type = p_edge->>'to_type'
      and entity_id = p_edge->>'to_id';

    if v_from_key is null or v_to_key is null then
      raise exception 'link references a node that does not exist in tenant %', p_tenant_id
        using errcode = '23503';
    end if;

    -- Idempotente: a mesma aresta aplicada duas vezes não duplica (unique em
    -- tenant_id, relation, from_key, to_key) e reabre uma aresta arquivada.
    insert into knowledge_graph_edges (
      tenant_id, relation, from_key, to_key, source, source_type, retrieved_at, confidence
    )
    values (
      p_tenant_id, p_edge->>'relation', v_from_key, v_to_key,
      p_edge->>'source', p_edge->>'source_type',
      (p_edge->>'retrieved_at')::timestamptz,
      nullif(p_edge->>'confidence', '')::numeric
    )
    on conflict (tenant_id, relation, from_key, to_key)
    do update set archived_at = null, retrieved_at = excluded.retrieved_at;
  end if;

  return jsonb_build_object(
    'applied', true,
    'version', v_node.version,
    'facts_written', v_inserted,
    'facts_blocked', v_blocked
  );
end;
$$;

revoke all on function knowledge_graph_apply_mutation(text, text, text, text, int, jsonb, jsonb, jsonb) from public;

grant execute on function knowledge_graph_apply_mutation(text, text, text, text, int, jsonb, jsonb, jsonb) to service_role;
