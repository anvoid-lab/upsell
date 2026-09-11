-- These columns only supported AI scheduling, presence and attribution.
-- Keep all conversation and message rows, including historical message content.
alter table public.conversations drop column if exists ai_scheduled;
alter table public.conversations drop column if exists last_viewed_at;
alter table public.messages drop column if exists sent_by_ai;
