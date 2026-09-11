-- Fase 3C: o claim do outbox passa a ser por tenant, e adquire um lease.
--
-- Duas lacunas da fase 1B que só se tornaram reais quando um consumer passou a existir:
--
--   1. `claim_outbox_events` era o ÚNICO read do projecto sem filtro de tenant — um
--      poller global. O CLAUDE.md não abre excepção ("no retrieval path may return
--      cross-tenant data"), e não havia consumer a exercê-lo, por isso passou. Agora
--      há. `p_tenant_id` fica obrigatório e sem default, como `match_tenant_documents`.
--   2. Um consumer que morra depois do claim deixava a linha em `processing` para
--      sempre: sem visibility timeout, sem reaper, invisível a um replay que só olha
--      para `failed`. É a única coisa que o pgmq nos dava e nós não tínhamos — e
--      custa duas colunas e um `or`, sem trocar de infra-estrutura.

alter table outbox_events add column if not exists claimed_at timestamptz;

alter table outbox_events add column if not exists claimed_by text;

-- Ordem total de aplicação.
--
-- A 1B ordenava o claim por `created_at`, o que só é uma ordem enquanto os eventos
-- não forem criados no mesmo instante. São: quatro mutações enfileiradas em sequência
-- caem no mesmo milissegundo e o `order by created_at` fica indefinido entre elas —
-- o `link` chegava a ser aplicado antes de existir o nó que liga. Não era visível na
-- 1B nem na 2 porque nada consumia a fila.
--
-- `bigint generated always as identity` dá a ordem de inserção, que é a ordem em que
-- as mutações têm de ser aplicadas. As linhas já existentes recebem valores na
-- alteração, preservando a ordem relativa que têm.
alter table outbox_events add column if not exists seq bigint generated always as identity;

-- O índice de 1B só cobria `status = 'pending'` e ordenava por `created_at`; o claim
-- passa a ver também os `processing` com lease caducado, e a ordenar por `seq`.
create index if not exists outbox_events_claimable_idx
  on outbox_events (tenant_id, seq)
  where status in ('pending', 'processing');

-- A assinatura antiga tem de sair explicitamente: `create or replace` não substitui
-- uma função cuja lista de parâmetros mudou, deixaria as duas a coexistir, e um
-- chamador que esquecesse o tenant continuaria a resolver para a versão global.
drop function if exists claim_outbox_events(int);

create or replace function claim_outbox_events(
  p_tenant_id text,
  p_limit int default 10,
  p_lease_seconds int default 300,
  p_claimed_by text default null,
  p_handoff text default null
)
returns setof outbox_events
language plpgsql
as $$
begin
  -- O `order by seq` tem de estar na SAÍDA, não só na selecção: o `returning` de um
  -- UPDATE não garante ordem — devolve as linhas pela ordem em que o plano as tocou.
  -- Ordenar apenas a subquery escolhe as linhas certas mas entrega-as baralhadas, e o
  -- consumer aplicaria um `link` antes do nó que ele liga existir.
  return query
  with claimed as (
    update outbox_events
    set status = 'processing',
        claimed_at = now(),
        claimed_by = p_claimed_by
    where id in (
      select id from outbox_events
      where tenant_id = p_tenant_id
        -- Sem `p_handoff` o claim é de todos os handoffs, como era. Com ele, cada
        -- consumer só reclama o que sabe aplicar: caso contrário o consumer do Knowledge Graph
        -- adquiria o lease de eventos da Execução, marcava-os `processing` e
        -- deixava-os assim até o lease caducar — a atrasar outra camada sem lhe tocar.
        and (p_handoff is null or handoff = p_handoff)
        and (
          status = 'pending'
          -- Lease caducado: o dono anterior desapareceu, a linha volta a reclamável.
          or (status = 'processing' and claimed_at < now() - make_interval(secs => p_lease_seconds))
        )
      order by seq
      limit p_limit
      for update skip locked
    )
    returning *
  )
  select * from claimed order by seq;
end;
$$;

revoke all on function claim_outbox_events(text, int, int, text, text) from public;

grant execute on function claim_outbox_events(text, int, int, text, text) to service_role;
