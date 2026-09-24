alter table public.messages
  add column reply_to_message_id bigint references public.messages(id) on delete set null,
  add column quoted_message jsonb,
  add column delivered_at timestamptz,
  add column read_at timestamptz,
  add column edited_at timestamptz,
  add column provider_deleted_at timestamptz,
  add column hidden boolean not null default false,
  add column reactions jsonb not null default '[]'::jsonb,
  add column provider_metadata jsonb not null default '{}'::jsonb;

alter table public.messages
  add constraint messages_quoted_message_is_object
    check (quoted_message is null or jsonb_typeof(quoted_message) = 'object'),
  add constraint messages_reactions_is_array
    check (jsonb_typeof(reactions) = 'array'),
  add constraint messages_provider_metadata_is_object
    check (jsonb_typeof(provider_metadata) = 'object');

alter table public.messages drop constraint messages_delivery_status_check;
alter table public.messages
  add constraint messages_delivery_status_check
  check (
    delivery_status is null or
    delivery_status in ('pending', 'sending', 'sent', 'delivered', 'read', 'failed')
  );

-- `read` previously meant that an outbound message had merely been sent.
-- From this migration onward it means that the recipient has actually read it.
update public.messages
set read = false
where direction = 'out' and read_at is null;

create index messages_reply_to_message_id_idx
  on public.messages (reply_to_message_id)
  where reply_to_message_id is not null;
