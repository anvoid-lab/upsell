-- Persist private notes independently from customer-visible messages. Notes
-- are written only through authenticated server actions and remain tenant
-- isolated through RLS.
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

create index conversation_notes_business_conversation_created_idx
  on public.conversation_notes (business_id, conversation_id, created_at desc)
  where deleted_at is null;

alter table public.conversation_notes enable row level security;

revoke all on table public.conversation_notes from anon, authenticated;
grant select, insert on table public.conversation_notes to authenticated;
revoke all on sequence public.conversation_notes_id_seq from anon, authenticated;
grant usage, select on sequence public.conversation_notes_id_seq to authenticated;

create policy conversation_notes_select_tenant
  on public.conversation_notes
  for select
  to authenticated
  using (business_id = (select public.current_business_id()));

create policy conversation_notes_insert_tenant
  on public.conversation_notes
  for insert
  to authenticated
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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_status_check'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_status_check
      check (status in ('open', 'pending', 'resolved'));
  end if;
end $$;
