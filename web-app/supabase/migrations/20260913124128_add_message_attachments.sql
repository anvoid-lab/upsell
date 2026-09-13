alter table public.messages
  add column attachment jsonb not null default '[]'::jsonb;

alter table public.messages
  add constraint messages_attachment_is_array
  check (jsonb_typeof(attachment) = 'array');
