-- Fase 4 (strategy-v0): política e playbooks versionados.
--
-- Até aqui, `data/config/policies.json` e `data/config/playbooks.json` existiam e
-- ninguém os lia; os limiares que governavam decisões estavam embutidos no código
-- (`upsell/brain/routing.py`, CONFIDENCE_THRESHOLD = 0.7, contra os 0.65 da política).
-- Um número embutido no código é uma violação directa da hierarquia de verdade de
-- docs/005 §3, onde a política é o nível mais alto. Estas duas tabelas são o sítio onde
-- ela passa a viver.
--
-- Porque não continuar a ler os ficheiros em runtime, que seria mais simples:
--
--   1. A regra do CLAUDE.md — "every indexed or queried record filters by tenant_id" —
--      não é verificável sobre um `json.load`. Sobre uma tabela é, e ganha o mesmo teste
--      de dois tenants que a Fase 3 tem.
--   2. `playbook_version` só é auditável se as versões antigas continuarem a existir
--      depois de a nova entrar. Um ficheiro editado no sítio apaga a versão anterior, e o
--      `playbook_version` gravado num AuditEnvelope de há três meses passa a apontar para
--      nada. Replay de um evento antigo tem de reproduzir a decisão que foi tomada, não a
--      que a versão de hoje tomaria.
--   3. É o mesmo desenho append-only de `knowledge_graph_facts` (Fase 3) e `audit_log`
--      (Fase 1B), já estabelecido no projecto.
--
-- Um `document jsonb` por versão, e não uma coluna por parâmetro. A política é lida
-- inteira e nunca consultada por campo, e uma coluna por limiar significaria uma migration
-- por limiar novo — o que torna acrescentar um limiar caro o suficiente para encorajar
-- exactamente o hardcoding que esta fase está a corrigir.

-- ---------------------------------------------------------------------------
-- Política
-- ---------------------------------------------------------------------------
create table if not exists strategy_policies (
  tenant_id text not null,
  policy_version text not null,
  document jsonb not null,
  -- `active` é a que a selecção normal usa. `deprecated` continua a servir um pin,
  -- porque explica decisões que governou. `retired` recusa até o pin: significa retirada
  -- (mudança de compliance, canal que já não podemos usar), não substituída.
  status text not null default 'active'
    check (status in ('active', 'deprecated', 'retired')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, policy_version)
);

create index if not exists strategy_policies_active_idx
  on strategy_policies (tenant_id, status);

alter table strategy_policies enable row level security;

-- ---------------------------------------------------------------------------
-- Playbooks
-- ---------------------------------------------------------------------------
create table if not exists strategy_playbooks (
  tenant_id text not null,
  playbook_id text not null,
  version text not null,
  document jsonb not null,
  status text not null default 'active'
    check (status in ('active', 'deprecated', 'retired')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, playbook_id, version)
);

create index if not exists strategy_playbooks_active_idx
  on strategy_playbooks (tenant_id, status);

alter table strategy_playbooks enable row level security;

-- ---------------------------------------------------------------------------
-- Append-only, com uma excepção deliberada
-- ---------------------------------------------------------------------------
-- O `document` é imutável: uma versão nunca é reescrita, publica-se outra. Mas `status`
-- TEM de mudar — depreciar uma versão é operação legítima e frequente. Em vez de abrir a
-- tabela toda ao UPDATE, usa-se grant a nível de coluna: só `status` é escrevível. A
-- imutabilidade do documento fica garantida pela base de dados, não por convenção.
revoke update, delete, truncate on strategy_policies from service_role;

revoke update, delete, truncate on strategy_playbooks from service_role;

grant update (status) on strategy_policies to service_role;

grant update (status) on strategy_playbooks to service_role;
