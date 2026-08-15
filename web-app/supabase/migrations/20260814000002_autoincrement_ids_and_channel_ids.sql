-- ============================================================
-- VendAI — 004: ids internos autoincrement, desacoplados dos ids de canal
-- Colar no SQL Editor do Supabase e executar (depois da 003).
-- ============================================================
--
-- id era `text primary key` sem default — quem inseria tinha de inventar um
-- valor em código de aplicação. Frágil, e não encaixa em como uma inbox
-- unificada funciona de facto: quando a integração real de canais existir
-- (T-010), cada conversa/mensagem chega já com um id próprio da plataforma
-- (ex: wamid do WhatsApp). Esse id não pode colidir com nem ser confundido
-- com a nossa chave primária.
--
-- Esta migração:
--   1. dá a conversations/messages/follow_ups um id interno bigint,
--      gerado pela base de dados (`generated always as identity`)
--   2. acrescenta channel_conversation_id / channel_message_id — colunas
--      nullable para guardar o id da plataforma externa, quando existir
--
-- Os dados semeados são descartáveis — esta migração trunca as tabelas
-- afectadas. Corre `npm run seed` a seguir.

truncate table ai_suggestions, follow_ups, messages, conversations restart identity cascade;

-- ─── Largar primeiro todas as FKs que apontam para conversations.id ──
-- A PK de conversations não pode ser largada enquanto houver constraints
-- filhas a depender do seu índice.
alter table messages drop constraint messages_conversation_id_fkey;
alter table follow_ups drop constraint follow_ups_conversation_id_fkey;
alter table ai_suggestions drop constraint ai_suggestions_conversation_id_fkey;

-- ─── conversations.id → bigint identity ──────────────────────
alter table conversations drop constraint conversations_pkey;
alter table conversations drop column id;
alter table conversations add column id bigint generated always as identity primary key;
alter table conversations add column channel_conversation_id text unique;

-- ─── messages: id + conversation_id ──────────────────────────
alter table messages drop constraint messages_pkey;
alter table messages drop column id;
alter table messages drop column conversation_id;
alter table messages add column id bigint generated always as identity primary key;
alter table messages add column conversation_id bigint not null references conversations(id) on delete cascade;
alter table messages add column channel_message_id text unique;

-- ─── follow_ups: id + conversation_id ────────────────────────
alter table follow_ups drop constraint follow_ups_pkey;
alter table follow_ups drop column id;
alter table follow_ups drop column conversation_id;
alter table follow_ups add column id bigint generated always as identity primary key;
alter table follow_ups add column conversation_id bigint not null references conversations(id) on delete cascade;

-- ─── ai_suggestions.conversation_id ───────────────────────────
-- ai_suggestions mantém o próprio id como uuid — só a FK muda de tipo.
alter table ai_suggestions drop column conversation_id;
alter table ai_suggestions add column conversation_id bigint references conversations(id) on delete cascade;

-- ─── Reconstruir índices que dependiam das colunas removidas ─
-- Postgres derruba automaticamente qualquer índice sobre uma coluna
-- eliminada com DROP COLUMN — têm de ser recriados.
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists follow_ups_conversation_id_idx on follow_ups(conversation_id);
create index if not exists ai_suggestions_conversation_id_idx on ai_suggestions(conversation_id);
create index if not exists messages_conversation_timestamp_idx on messages (conversation_id, "timestamp");
