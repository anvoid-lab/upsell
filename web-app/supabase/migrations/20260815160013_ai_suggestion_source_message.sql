-- ============================================================
-- VendAI — link each suggestion to the message that prompted it
-- ============================================================
--
-- Until now, deciding whether a cached suggestion was still valid meant
-- comparing `ai_suggestions.created_at` against the `timestamp` of the latest
-- inbound message. Those two are not comparable: `created_at` is our database's
-- clock, `timestamp` is the provider's (when the customer hit send). Any clock
-- drift, or a delayed delivery, makes the comparison give the wrong answer —
-- and the symptom is generating a fresh suggestion (and paying for the call)
-- every time the conversation is opened.
--
-- This makes it explicit: store WHICH message the suggestion was generated for.
-- The check stops being "is it newer than?" and becomes "is it the same
-- message?" — deterministic, with no clocks involved.
--
-- The suggestion covers the whole conversation up to that message; storing the
-- last message of the group is what identifies the group.

alter table ai_suggestions
  add column if not exists source_message_id bigint references messages(id) on delete set null;

-- `set null` rather than `cascade`: `ai_suggestions` doubles as an audit log
-- (T-006). If the message goes away, the record that a suggestion was generated
-- is still worth keeping — only the link is lost, and the suggestion then stops
-- counting as a valid cache entry (null never matches a message).

-- The cache lookup is always "the latest suggestion for this conversation"
-- followed by comparing the link — hence the composite index.
create index if not exists ai_suggestions_conversation_source_idx
  on ai_suggestions (conversation_id, source_message_id);

-- Rows predating this migration keep source_message_id null: there is no
-- reliable way to reconstruct the link after the fact (it is precisely the
-- information that was missing). In practice they are invalidated once and
-- regenerated.
