-- Provider-neutral inbox accounts. The application owns the local ids and the
-- provider-specific ids are kept only at this boundary.

alter table public.channels
  drop constraint if exists channels_platform_key;

alter table public.channels
  add column if not exists provider text not null default 'unipile',
  add column if not exists provider_account_id text,
  add column if not exists connection_status text not null default 'disconnected',
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

alter table public.channels
  drop constraint if exists channels_connection_status_check;
alter table public.channels
  add constraint channels_connection_status_check
  check (connection_status in ('disconnected', 'connecting', 'syncing', 'connected', 'reconnect_required', 'error'));

create unique index if not exists channels_business_provider_platform_active_idx
  on public.channels (business_id, provider, platform)
  where deleted_at is null;

create unique index if not exists channels_provider_account_idx
  on public.channels (provider, provider_account_id)
  where provider_account_id is not null and deleted_at is null;

alter table public.conversations
  add column if not exists channel_id uuid references public.channels(id) on delete set null;

alter table public.conversations
  drop constraint if exists conversations_channel_conversation_id_key;

create unique index if not exists conversations_channel_external_id_idx
  on public.conversations (channel_id, channel_conversation_id)
  where channel_id is not null and channel_conversation_id is not null and deleted_at is null;

create index if not exists conversations_channel_id_idx on public.conversations (channel_id);

alter table public.messages
  add column if not exists channel_id uuid references public.channels(id) on delete set null;

alter table public.messages
  drop constraint if exists messages_channel_message_id_key;

create unique index if not exists messages_channel_external_id_idx
  on public.messages (channel_id, channel_message_id)
  where channel_id is not null and channel_message_id is not null and deleted_at is null;

create index if not exists messages_channel_id_idx on public.messages (channel_id);

-- Existing fixtures become explicit local placeholders until an account is
-- connected through Hosted Auth.
update public.channels
set connected = false,
    connection_status = 'disconnected',
    provider_account_id = null
where provider_account_id is null;
