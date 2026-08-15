-- ============================================================
-- VendAI — 003: multi-tenancy + RLS
-- Colar no SQL Editor do Supabase e executar (depois da 002).
-- ============================================================
--
-- Antes desta migração nenhuma tabela sabia a que negócio pertencia: todos os
-- utilizadores viam as mesmas conversas. Esta migração introduz `businesses`,
-- liga cada linha de domínio a um negócio, e activa políticas RLS para que
-- cada tenant só veja e altere os seus próprios dados.
--
-- As políticas dependem de `auth.uid()`, ou seja, exigem uma sessão Supabase
-- real. O login tem de usar supabase.auth (password), não um cookie próprio.

-- ─── Businesses ──────────────────────────────────────────────
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ─── Ligar profiles a um business ────────────────────────────
alter table profiles
  add column if not exists business_id uuid references businesses(id) on delete cascade;

-- ─── Resolver o business do utilizador autenticado ───────────
-- SECURITY DEFINER: a função lê `profiles` ignorando o RLS dessa tabela, o que
-- evita a recursão infinita de uma política de profiles que consultasse profiles.
create or replace function current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from profiles where id = auth.uid();
$$;

revoke all on function current_business_id() from public;
grant execute on function current_business_id() to authenticated;

-- ─── business_id nas tabelas de domínio ──────────────────────
alter table conversations   add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table messages        add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table follow_ups      add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table channels        add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table ai_settings     add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table ai_suggestions  add column if not exists business_id uuid references businesses(id) on delete cascade;

-- ─── Backfill ────────────────────────────────────────────────
-- Os dados existentes são fixtures de um único negócio. Cria-o (se não existir),
-- atribui-lhe todas as linhas órfãs, e liga-lhe os utilizadores já registados
-- para não perderem acesso ao que já viam.
do $$
declare
  b uuid;
begin
  select id into b from businesses order by created_at limit 1;
  if b is null then
    insert into businesses (name) values ('Shop & Go Luanda') returning id into b;
  end if;

  update conversations  set business_id = b where business_id is null;
  update messages       set business_id = b where business_id is null;
  update follow_ups     set business_id = b where business_id is null;
  update channels       set business_id = b where business_id is null;
  update ai_settings    set business_id = b where business_id is null;
  update ai_suggestions set business_id = b where business_id is null;

  insert into profiles (id, email, business_id)
  select u.id, u.email, b from auth.users u
  on conflict (id) do update set business_id = coalesce(profiles.business_id, excluded.business_id);
end $$;

-- ─── NOT NULL + default automático ───────────────────────────
-- O default faz com que qualquer INSERT vindo da app já traga o business
-- correcto, sem a camada de repositório ter de o preencher.
alter table conversations   alter column business_id set not null, alter column business_id set default current_business_id();
alter table messages        alter column business_id set not null, alter column business_id set default current_business_id();
alter table follow_ups      alter column business_id set not null, alter column business_id set default current_business_id();
alter table channels        alter column business_id set not null, alter column business_id set default current_business_id();
alter table ai_settings     alter column business_id set not null, alter column business_id set default current_business_id();
alter table ai_suggestions  alter column business_id set not null, alter column business_id set default current_business_id();

-- ─── Índices ─────────────────────────────────────────────────
-- Toda a query passa a filtrar por business_id via RLS.
create index if not exists conversations_business_idx   on conversations (business_id);
create index if not exists messages_business_idx        on messages (business_id);
create index if not exists follow_ups_business_idx      on follow_ups (business_id);
create index if not exists channels_business_idx        on channels (business_id);
create index if not exists ai_settings_business_idx     on ai_settings (business_id);
create index if not exists ai_suggestions_business_idx  on ai_suggestions (business_id);
create index if not exists profiles_business_idx        on profiles (business_id);

-- ─── Criar business + profile a cada novo registo ────────────
-- Cada registo novo é um tenant novo, com o seu próprio negócio vazio.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b uuid;
begin
  insert into businesses (name)
  values (coalesce(nullif(new.raw_user_meta_data->>'business_name', ''), split_part(new.email, '@', 1)))
  returning id into b;

  insert into profiles (id, email, business_id, name)
  values (new.id, new.email, b, nullif(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do update set business_id = excluded.business_id;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── RLS ─────────────────────────────────────────────────────
alter table businesses      enable row level security;
alter table profiles        enable row level security;
alter table conversations   enable row level security;
alter table messages        enable row level security;
alter table follow_ups      enable row level security;
alter table channels        enable row level security;
alter table ai_settings     enable row level security;
alter table ai_suggestions  enable row level security;

-- Idempotência: recriar limpo.
drop policy if exists businesses_tenant     on businesses;
drop policy if exists profiles_self         on profiles;
drop policy if exists conversations_tenant  on conversations;
drop policy if exists messages_tenant       on messages;
drop policy if exists follow_ups_tenant     on follow_ups;
drop policy if exists channels_tenant       on channels;
drop policy if exists ai_settings_tenant    on ai_settings;
drop policy if exists ai_suggestions_tenant on ai_suggestions;

-- Um utilizador vê apenas o seu próprio profile.
create policy profiles_self on profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- E apenas o negócio a que pertence.
create policy businesses_tenant on businesses
  for all to authenticated
  using (id = current_business_id())
  with check (id = current_business_id());

-- Dados de domínio: sempre confinados ao business do utilizador.
-- O WITH CHECK impede escrever para dentro do tenant de outrem.
create policy conversations_tenant on conversations
  for all to authenticated
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

create policy messages_tenant on messages
  for all to authenticated
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

create policy follow_ups_tenant on follow_ups
  for all to authenticated
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

create policy channels_tenant on channels
  for all to authenticated
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

create policy ai_settings_tenant on ai_settings
  for all to authenticated
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

create policy ai_suggestions_tenant on ai_suggestions
  for all to authenticated
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

-- Nota: não há políticas para o papel `anon`. Sem sessão não há dados —
-- é intencional. O seed corre com a chave secreta, que ignora RLS.
