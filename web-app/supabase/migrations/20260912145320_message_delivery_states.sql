-- Persist outbound messages before calling the provider so the inbox can show
-- pending and failed states and retry the same local message safely.

alter table public.messages
  add column client_message_id uuid,
  add column delivery_status text,
  add column delivery_error text,
  add column delivery_updated_at timestamptz;

update public.messages
set delivery_status = 'sent',
    delivery_updated_at = coalesce(created_at, now())
where direction = 'out';

alter table public.messages
  add constraint messages_delivery_status_check
  check (delivery_status is null or delivery_status in ('pending', 'sending', 'sent', 'failed'));

create unique index messages_business_client_message_idx
  on public.messages (business_id, client_message_id)
  where client_message_id is not null and deleted_at is null;

create index messages_outbound_reconciliation_idx
  on public.messages (business_id, conversation_id, timestamp desc)
  where direction = 'out'
    and channel_message_id is null
    and delivery_status in ('pending', 'sending')
    and deleted_at is null;
