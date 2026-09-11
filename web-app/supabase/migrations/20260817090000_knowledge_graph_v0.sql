-- Fase 3 (knowledge-graph-v0): a memória reconciliada do Sales Brain.
--
-- Três tabelas, porque respondem a três perguntas diferentes:
--   * `knowledge_graph_nodes` é a identidade — "que entidade é esta, em que versão está, e qual é
--     a sua projecção corrente?". Uma linha mutável por (tenant, tipo, id).
--   * `knowledge_graph_facts` é a memória append-only — "quem afirmou o quê, quando, e com que
--     confiança?". docs/02 §5 exige provenance POR FACTO e §6.4 exige reter AMBAS as
--     versões quando há conflito; nenhuma das duas cabe num jsonb achatado por nó.
--   * `knowledge_graph_edges` é o grafo — as relações que a travessia percorre.
--
-- `knowledge_graph_nodes.resolved` é a projecção materializada dos factos vencedores, calculada na
-- ESCRITA. Resolver na leitura seria mais simples e mais correcto por construção, mas
-- não sobrevive ao SLA de 150ms p95 de docs/02 §9 com N factos × M nós por pedido.
--
-- A travessia é um `WITH RECURSIVE` sobre `knowledge_graph_edges`, sem extensões.
--
-- O pgRouting (`pgr_drivingDistance`) foi avaliado e recusado para a v0: tem
-- dependência dura de PostGIS (`pg_available_extension_versions.requires` = {postgis}),
-- e instalar o PostGIS inteiro — centenas de funções, tipos geométricos, spatial_ref_sys
-- — numa base de dados partilhada com outra aplicação é pegada desproporcionada para
-- uma travessia de ~15 linhas. Nada aqui usa geometria.
--
-- A porta fica aberta: as chaves surrogate `bigint` abaixo existem no formato que o
-- pgRouting exige (ANY-INTEGER), portanto trocar o corpo desta função por
-- `pgr_drivingDistance` na Fase 5 — se a expansão ponderada por relevância o
-- justificar, e já numa base de dados própria — não mexe no modelo de dados.

-- ---------------------------------------------------------------------------
-- Nós
-- ---------------------------------------------------------------------------
-- `node_key` existe porque o pgRouting só entende vértices ANY-INTEGER
-- ("SMALLINT, INTEGER, BIGINT" — UUID e text excluídos), e os nossos entity_id são
-- strings opacas (docs/07 §10). É uma chave surrogate, não a identidade: a chave
-- natural continua a ser (tenant_id, entity_type, entity_id). Como efeito lateral,
-- torna o motor de travessia substituível — as mesmas colunas serviriam um
-- WITH RECURSIVE sem alterar o modelo.
create table if not exists knowledge_graph_nodes (
  node_key bigint generated always as identity unique,
  tenant_id text not null,
  entity_type text not null check (entity_type in (
    -- v0. As entidades v0.5 (Objection, PainPoint, Competitor, Product, Playbook)
    -- existem no contrato KnowledgeGraphMutation mas são rejeitadas por allowlist em
    -- runtime até a Fase 5 as exigir — assim não é preciso um major bump agora e
    -- outro depois.
    'Account', 'Contact', 'Opportunity', 'Interaction', 'Evidence', 'Task'
  )),
  entity_id text not null,
  version int not null default 0,
  resolved jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, entity_type, entity_id)
);

alter table knowledge_graph_nodes enable row level security;

-- ---------------------------------------------------------------------------
-- Factos (append-only)
-- ---------------------------------------------------------------------------
-- Esta tabela é a primeira das três camadas que garantem "llm_inferred nunca
-- sobrescreve system_of_record" (docs/02 §6): sendo append-only, nada sobrescreve
-- nada — a pergunta passa a ser apenas qual claim vence na projecção. A segunda
-- camada é a função de precedência em Python; a terceira é a guarda dentro de
-- knowledge_graph_apply_mutation, que recusa a promoção mesmo que o chamador a peça.
--
-- `freshness` NÃO é uma coluna: é derivada de `retrieved_at` no momento da leitura.
-- Um `fresh` gravado fica errado sozinho com a passagem do tempo e obrigaria a um
-- sweeper periódico só para manter uma coluna honesta.
create table if not exists knowledge_graph_facts (
  fact_id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  entity_type text not null,
  entity_id text not null,
  attribute text not null,
  value jsonb not null,
  source text not null,
  source_type text not null check (source_type in (
    'system_of_record', 'communication', 'enrichment', 'llm_inferred', 'manual'
  )),
  retrieved_at timestamptz not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  conflict boolean not null default false,
  superseded_by uuid references knowledge_graph_facts (fact_id),
  created_at timestamptz not null default now()
);

alter table knowledge_graph_facts enable row level security;

-- A leitura do contexto vai buscar os factos vivos de um conjunto de entidades.
create index if not exists knowledge_graph_facts_entity_idx
  on knowledge_graph_facts (tenant_id, entity_type, entity_id)
  where superseded_by is null;

-- A precedência compara claims do mesmo atributo entre si.
create index if not exists knowledge_graph_facts_attribute_idx
  on knowledge_graph_facts (tenant_id, entity_type, entity_id, attribute)
  where superseded_by is null;

-- ---------------------------------------------------------------------------
-- Arestas
-- ---------------------------------------------------------------------------
-- `cost` fica a 1 em toda a v0, logo `agg_cost` do pgRouting é a contagem de saltos
-- e o parâmetro `distance` é o limite de profundidade. Quando a Fase 5 quiser
-- expansão ponderada por relevância, `cost` deixa de ser 1 e a mesma chamada passa a
-- devolver ranking — sem migração.
create table if not exists knowledge_graph_edges (
  edge_key bigint generated always as identity primary key,
  tenant_id text not null,
  relation text not null check (relation in (
    'HAS_CONTACT', 'HAS_OPPORTUNITY', 'PARTICIPATED_IN', 'CITES', 'LINKED_TO'
  )),
  from_key bigint not null references knowledge_graph_nodes (node_key),
  to_key bigint not null references knowledge_graph_nodes (node_key),
  cost double precision not null default 1,
  version int not null default 0,
  source text not null,
  source_type text not null check (source_type in (
    'system_of_record', 'communication', 'enrichment', 'llm_inferred', 'manual'
  )),
  retrieved_at timestamptz not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, relation, from_key, to_key)
);

alter table knowledge_graph_edges enable row level security;

-- A travessia é bidirecional (chega-se à Account a partir de um Contact), por isso
-- ambos os sentidos são indexados.
create index if not exists knowledge_graph_edges_from_idx on knowledge_graph_edges (tenant_id, from_key) where archived_at is null;

create index if not exists knowledge_graph_edges_to_idx on knowledge_graph_edges (tenant_id, to_key) where archived_at is null;

-- ---------------------------------------------------------------------------
-- Leitura: AccountContextSnapshot(account_id, depth) — docs/02 §8
-- ---------------------------------------------------------------------------
-- Devolve um único jsonb com nós, arestas e factos vivos do subgrafo. Os factos vão
-- com a provenance completa porque o freshness é calculado em Python (o TTL é
-- política, não schema) e alimenta `stale_fact_ids` no contrato.
--
-- `p_tenant_id` não tem default, à semelhança de `match_tenant_documents`: obriga
-- quem chama a ser explícito sobre o tenant, em vez de o poder esquecer. E, ao
-- contrário do que aconteceria com pgRouting (cujo Edges SQL é um parâmetro TEXT),
-- aqui o tenant é um parâmetro ligado dentro da recursão — não há interpolação.
create or replace function knowledge_graph_account_context(
  p_tenant_id text,
  p_account_id text,
  p_depth int default 2
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_root_key bigint;
  v_depth int;
  v_keys bigint[];
  v_result jsonb;
begin
  -- Limite de profundidade da v0. Um pedido com depth maior é servido, não recusado,
  -- mas truncado — o Brain não deve falhar por pedir contexto a mais.
  v_depth := least(greatest(coalesce(p_depth, 2), 0), 3);

  select node_key into v_root_key
  from knowledge_graph_nodes
  where tenant_id = p_tenant_id
    and entity_type = 'Account'
    and entity_id = p_account_id
    and archived_at is null;

  -- Conta inexistente — ou pertencente a outro tenant — lê como ausente, não como
  -- erro. Mesma postura do lifecycle na Fase 2: um trace de outro tenant não existe.
  if v_root_key is null then
    return jsonb_build_object(
      'account_id', p_account_id,
      'depth', v_depth,
      'nodes', '[]'::jsonb,
      'edges', '[]'::jsonb,
      'facts', '[]'::jsonb
    );
  end if;

  -- Expansão bidirecional a partir da raiz: chega-se à Account a partir de um Contact,
  -- não só ao contrário, por isso cada aresta é seguida nos dois sentidos.
  --
  -- A recursão termina por `d < v_depth` — com o tecto de 3 da v0 não é preciso um
  -- array de visitados para garantir terminação; o `union` deduplica (node_key, d)
  -- repetidos e o `distinct` no agregado final trata do resto.
  --
  -- A raiz entra sempre, mesmo sem arestas: uma Account acabada de criar, ainda sem
  -- contactos, não aparece em aresta nenhuma e seria invisível a uma travessia pura.
  with recursive reached (node_key, d) as (
    select v_root_key, 0
    union
    select
      case when e.from_key = r.node_key then e.to_key else e.from_key end,
      r.d + 1
    from reached r
    join knowledge_graph_edges e
      on (e.from_key = r.node_key or e.to_key = r.node_key)
     and e.tenant_id = p_tenant_id
     and e.archived_at is null
    where r.d < v_depth
  )
  select array_agg(distinct node_key) into v_keys from reached;

  select jsonb_build_object(
    'account_id', p_account_id,
    'depth', v_depth,
    'nodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'entity_type', n.entity_type,
        'entity_id', n.entity_id,
        'resolved', n.resolved,
        'version', n.version
      ) order by n.entity_type, n.entity_id)
      from knowledge_graph_nodes n
      where n.tenant_id = p_tenant_id
        and n.node_key = any (v_keys)
        and n.archived_at is null
    ), '[]'::jsonb),
    'edges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'relation', e.relation,
        'from_type', nf.entity_type,
        'from_id', nf.entity_id,
        'to_type', nt.entity_type,
        'to_id', nt.entity_id
      ) order by e.relation, nf.entity_id, nt.entity_id)
      from knowledge_graph_edges e
      join knowledge_graph_nodes nf on nf.node_key = e.from_key
      join knowledge_graph_nodes nt on nt.node_key = e.to_key
      where e.tenant_id = p_tenant_id
        and e.archived_at is null
        and e.from_key = any (v_keys)
        and e.to_key = any (v_keys)
    ), '[]'::jsonb),
    'facts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fact_id', f.fact_id,
        'entity_type', f.entity_type,
        'entity_id', f.entity_id,
        'attribute', f.attribute,
        'value', f.value,
        'source', f.source,
        'source_type', f.source_type,
        'retrieved_at', f.retrieved_at,
        'confidence', f.confidence,
        'conflict', f.conflict
      ) order by f.entity_type, f.entity_id, f.attribute, f.retrieved_at desc)
      from knowledge_graph_facts f
      join knowledge_graph_nodes n
        on n.tenant_id = f.tenant_id
       and n.entity_type = f.entity_type
       and n.entity_id = f.entity_id
      where f.tenant_id = p_tenant_id
        and f.superseded_by is null
        and n.node_key = any (v_keys)
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- RLS fica ligada sem políticas pela mesma razão de `documents` / `tenant_documents`
-- / `audit_log` / `brain_lifecycle`: o pipeline liga-se sempre como service_role, que
-- ignora RLS por definição, portanto a aplicação real é feita pelos grants abaixo e
-- pelo filtro explícito de tenant_id em cada leitura. A RLS é a rede de segurança
-- caso anon/authenticated venham a ganhar acesso REST.
grant select, insert, update on knowledge_graph_nodes to service_role;

revoke delete, truncate on knowledge_graph_nodes from service_role;

-- Append-only reforçado na base, como `audit_log` e `brain_state_transitions`: o
-- update é permitido apenas para marcar `superseded_by` — a alternativa seria uma
-- trigger a restringir colunas, desnecessária enquanto a única escrita passa por
-- knowledge_graph_apply_mutation.
grant select, insert, update (superseded_by, conflict) on knowledge_graph_facts to service_role;

revoke delete, truncate on knowledge_graph_facts from service_role;

grant select, insert, update on knowledge_graph_edges to service_role;

revoke delete, truncate on knowledge_graph_edges from service_role;

revoke all on function knowledge_graph_account_context(text, text, int) from public;

grant execute on function knowledge_graph_account_context(text, text, int) to service_role;
