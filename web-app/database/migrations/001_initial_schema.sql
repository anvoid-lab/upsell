-- ============================================================
-- VendAI — Schema inicial
-- Colar no SQL Editor do Supabase e executar
-- ============================================================

-- Extensão para UUIDs
create extension if not exists "pgcrypto";

-- ─── Profiles (extensão do auth.users) ──────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text unique not null,
  role        text not null default 'admin',
  business_name text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ─── Conversations ───────────────────────────────────────────
create table if not exists conversations (
  id              text primary key,
  contact         jsonb not null,
  last_message    text not null,
  last_message_at text not null,
  status          text not null default 'open',
  unread          boolean not null default true,
  ai_scheduled    boolean not null default false,
  product_interest jsonb,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ─── Messages ────────────────────────────────────────────────
create table if not exists messages (
  id              text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  content         text not null,
  direction       text not null,
  timestamp       text not null,
  read            boolean not null default false,
  sent_by_ai      boolean not null default false,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ─── Follow-ups ──────────────────────────────────────────────
create table if not exists follow_ups (
  id              text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  contact_name    text,
  title           text,
  message         text,
  status          text not null default 'scheduled',
  type            text,
  scheduled_for   text,
  sent_at         text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ─── Channels ────────────────────────────────────────────────
create table if not exists channels (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null unique,
  connected    boolean not null default false,
  account_name text,
  connected_at text,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- ─── AI Settings ─────────────────────────────────────────────
create table if not exists ai_settings (
  id                      uuid primary key default gen_random_uuid(),
  follow_up_delay_hours   int not null default 4,
  use_urgency             boolean not null default true,
  use_upsell              boolean not null default true,
  use_social_proof        boolean not null default true,
  use_cart_recovery       boolean not null default true,
  tone                    text not null default 'friendly',
  language                text not null default 'pt',
  created_at              timestamptz not null default now(),
  deleted_at              timestamptz
);

-- ─── AI Suggestions ──────────────────────────────────────────
create table if not exists ai_suggestions (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text references conversations(id) on delete cascade,
  message         text,
  type            text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ─── Índices ──────────────────────────────────────────────────
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists follow_ups_conversation_id_idx on follow_ups(conversation_id);
create index if not exists ai_suggestions_conversation_id_idx on ai_suggestions(conversation_id);
create index if not exists conversations_status_idx on conversations(status);

-- ─── RLS desactivado (dev) — activar antes de produção ───────
alter table profiles disable row level security;
alter table conversations disable row level security;
alter table messages disable row level security;
alter table follow_ups disable row level security;
alter table channels disable row level security;
alter table ai_settings disable row level security;
alter table ai_suggestions disable row level security;
