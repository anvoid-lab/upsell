-- Clean MVP schema for the provider-neutral inbox.
-- AI, RAG, knowledge graph, agent lifecycle and AI queue persistence are
-- intentionally excluded from this baseline.

create extension if not exists pgcrypto with schema extensions;

create table public.businesses (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique not null,
  role text not null default 'admin',
  business_name text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  business_id uuid references public.businesses(id) on delete cascade
);

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select business_id
  from public.profiles
  where id = (select auth.uid());
$$;

revoke all on function public.current_business_id() from public;
grant execute on function public.current_business_id() to authenticated;

create table public.channels (
  id uuid primary key default extensions.gen_random_uuid(),
  platform text not null,
  connected boolean not null default false,
  account_name text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  business_id uuid not null references public.businesses(id) on delete cascade
    default public.current_business_id(),
  provider text not null default 'unipile',
  provider_account_id text,
  connection_status text not null default 'disconnected'
    check (connection_status in (
      'disconnected',
      'connecting',
      'syncing',
      'connected',
      'reconnect_required',
      'error'
    )),
  provider_metadata jsonb not null default '{}'::jsonb
);

create table public.conversations (
  id bigint generated always as identity primary key,
  contact jsonb not null,
  last_message text not null,
  last_message_at timestamptz not null default now(),
  status text not null default 'open'
    check (status in ('open', 'pending', 'resolved')),
  unread boolean not null default true,
  product_interest jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  business_id uuid not null references public.businesses(id) on delete cascade
    default public.current_business_id(),
  channel_conversation_id text,
  channel_id uuid references public.channels(id) on delete set null
);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  content text not null,
  direction text not null,
  "timestamp" timestamptz not null default now(),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  business_id uuid not null references public.businesses(id) on delete cascade
    default public.current_business_id(),
  channel_message_id text,
  channel_id uuid references public.channels(id) on delete set null,
  client_message_id uuid,
  delivery_status text
    check (delivery_status is null or delivery_status in ('pending', 'sending', 'sent', 'failed')),
  delivery_error text,
  delivery_updated_at timestamptz
);

create table public.follow_ups (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  contact_name text,
  title text,
  message text,
  status text not null default 'scheduled',
  type text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  business_id uuid not null references public.businesses(id) on delete cascade
    default public.current_business_id()
);

create table public.conversation_notes (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade
    default public.current_business_id(),
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict
    default auth.uid(),
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index profiles_business_idx on public.profiles (business_id);
create index channels_business_idx on public.channels (business_id);
create unique index channels_business_provider_platform_active_idx
  on public.channels (business_id, provider, platform)
  where deleted_at is null;
create unique index channels_provider_account_idx
  on public.channels (provider, provider_account_id)
  where provider_account_id is not null and deleted_at is null;

create index conversations_business_idx on public.conversations (business_id);
create index conversations_status_idx on public.conversations (status);
create index conversations_last_message_at_idx on public.conversations (last_message_at desc);
create index conversations_channel_id_idx on public.conversations (channel_id);
create unique index conversations_channel_external_id_idx
  on public.conversations (channel_id, channel_conversation_id)
  where channel_id is not null
    and channel_conversation_id is not null
    and deleted_at is null;

create index messages_business_idx on public.messages (business_id);
create index messages_conversation_id_idx on public.messages (conversation_id);
create index messages_conversation_timestamp_idx
  on public.messages (conversation_id, "timestamp");
create index messages_channel_id_idx on public.messages (channel_id);
create unique index messages_channel_external_id_idx
  on public.messages (channel_id, channel_message_id)
  where channel_id is not null
    and channel_message_id is not null
    and deleted_at is null;
create unique index messages_business_client_message_idx
  on public.messages (business_id, client_message_id)
  where client_message_id is not null and deleted_at is null;
create index messages_outbound_reconciliation_idx
  on public.messages (business_id, conversation_id, "timestamp" desc)
  where direction = 'out'
    and channel_message_id is null
    and delivery_status in ('pending', 'sending')
    and deleted_at is null;

create index follow_ups_business_idx on public.follow_ups (business_id);
create index follow_ups_conversation_id_idx on public.follow_ups (conversation_id);
create index follow_ups_due_idx on public.follow_ups (scheduled_for)
  where status = 'scheduled' and deleted_at is null;

create index conversation_notes_business_conversation_created_idx
  on public.conversation_notes (business_id, conversation_id, created_at desc)
  where deleted_at is null;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.follow_ups enable row level security;
alter table public.conversation_notes enable row level security;

create policy businesses_tenant on public.businesses
  for all to authenticated
  using (id = (select public.current_business_id()))
  with check (id = (select public.current_business_id()));

create policy profiles_self on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy channels_tenant on public.channels
  for all to authenticated
  using (business_id = (select public.current_business_id()))
  with check (business_id = (select public.current_business_id()));

create policy conversations_tenant on public.conversations
  for all to authenticated
  using (business_id = (select public.current_business_id()))
  with check (business_id = (select public.current_business_id()));

create policy messages_tenant on public.messages
  for all to authenticated
  using (business_id = (select public.current_business_id()))
  with check (business_id = (select public.current_business_id()));

create policy follow_ups_tenant on public.follow_ups
  for all to authenticated
  using (business_id = (select public.current_business_id()))
  with check (business_id = (select public.current_business_id()));

create policy conversation_notes_select_tenant on public.conversation_notes
  for select to authenticated
  using (business_id = (select public.current_business_id()));

create policy conversation_notes_insert_tenant on public.conversation_notes
  for insert to authenticated
  with check (
    business_id = (select public.current_business_id())
    and author_id = (select auth.uid())
    and exists (
      select 1
      from public.conversations
      where conversations.id = conversation_notes.conversation_id
        and conversations.business_id = conversation_notes.business_id
        and conversations.deleted_at is null
    )
  );

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on table
  public.businesses,
  public.profiles,
  public.channels,
  public.conversations,
  public.messages,
  public.follow_ups
to authenticated;
grant select, insert on table public.conversation_notes to authenticated;
grant usage, select on sequence
  public.conversations_id_seq,
  public.messages_id_seq,
  public.follow_ups_id_seq,
  public.conversation_notes_id_seq
to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_business_id uuid;
begin
  insert into public.businesses (name)
  values (
    coalesce(
      nullif(new.raw_user_meta_data->>'business_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  returning id into new_business_id;

  insert into public.profiles (id, email, business_id, name)
  values (
    new.id,
    new.email,
    new_business_id,
    nullif(new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do update
    set business_id = excluded.business_id;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end;
$$;
