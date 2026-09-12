# Inbox MVP — One-Week Plan

## Objective

Deliver the minimum functional inbox journey in one week:

```text
Company connects Instagram -> receives a message -> replies ->
refreshes the page without losing the conversation state
```

## Scope Decisions

- Channel: Instagram.
- Provider: Unipile, using the existing v1 integration.
- One Instagram account per company.
- Text messages only.
- No attachments.
- No WhatsApp or Facebook.
- No team members, invitations, or assignees in the MVP.
- No follow-ups, analytics, or commercial outcomes this week.
- `sent` means Unipile accepted the message; delivery and read confirmations are outside the MVP.

## Phase Completion Rule

Each phase below is considered complete only after the user requests its commit and the commit is created. Until then, the phase remains in progress even if its implementation and tests are ready.

## Phase 1 — End-to-End Real Instagram Flow

### Objective

Validate and stabilize the existing integration with a real Instagram account.

### Work

- Confirm the credentials and public URL configured in the environment.
- Connect a real account using Unipile Hosted Auth.
- Confirm webhook registration and authentication.
- Receive a real message in the inbox.
- Reply from the application and confirm receipt on Instagram.
- Ensure the correct channel is associated with the correct company.
- Ensure repeated webhooks do not create duplicate messages.
- Handle disconnected accounts, invalid credentials, and reconnection requirements.

### Completion Criteria

- A real account can be connected.
- A received message appears in the inbox.
- A reply sent from the application reaches the customer.
- Repeating the same webhook does not create a second message.
- One company cannot receive data from another company's account.

## Phase 2 — Sending States and Recovery

### Objective

Prevent message loss and make sending failures visible and recoverable.

### Work

- Persist the message before calling Unipile.
- Implement `pending`, `sent`, and `failed` states.
- Immediately display the message as pending.
- Mark it as sent when Unipile accepts the message.
- Display the failure next to the corresponding message.
- Preserve the text when sending fails.
- Allow retry on the same local message.
- Prevent double-clicks and simultaneous attempts for the same message.
- Reconcile the webhook echo with the local message without duplication.

### Completion Criteria

- The user can see whether a message is pending, sent, or failed.
- A failure does not erase the written content.
- A retry does not create another local row.
- Repeated clicks do not trigger concurrent sends.
- An echo received through Realtime or a webhook does not duplicate the visible message.

## Phase 3 — Minimum Inbox Persistence

### Objective

Ensure the inbox remains correct after a refresh or when switching conversations.

### Work

- Persist the conversation state: `open`, `pending`, or `resolved`.
- Allow a conversation to be closed and reopened.
- Create persistent internal notes for each conversation.
- Store the author and date of each note.
- Apply company isolation and RLS policies to notes.
- Validate operations on the server.
- Remove or hide assignment to fictional team members.
- Roll back optimistic changes when persistence fails.

### Completion Criteria

- The conversation state survives a refresh.
- Notes appear only in the conversation where they were created.
- Notes are never sent to the customer.
- Notes and conversations remain isolated by company.
- The interface does not display fictional assignees.

## Phase 4 — Empty States and Reconnection

### Objective

Allow a new company to understand what to do without relying on demonstration data.

### Work

- No channel: display the `Connect Instagram` action.
- Channel connecting or synchronizing: display progress.
- Channel connected without conversations: display `Waiting for the first message`.
- Channel with expired credentials: display the `Reconnect` action.
- Loading error: display the error and a `Try again` action.
- Inbox with conversations: display the normal flow.

### Completion Criteria

- A new company can start the connection from the inbox.
- A disconnected channel, an empty inbox, and an error are visually distinct states.
- Every recoverable error offers a clear next action.

## Phase 5 — MVP Validation and Delivery

### Objective

Confirm that the main journey works repeatedly before delivery.

### Required Tests

- Channel connection and callback.
- Message receipt.
- Duplicate webhook.
- Successful message sending.
- Failed message sending.
- Retry without duplicating the local message.
- Conversation state and note persistence.
- Permissions and RLS policies for new structures.
- Isolation between two companies.
- Empty states and reconnection.

### Final Checks

- Run unit tests.
- Run integration tests against Supabase.
- Run the production build.
- Fix the minimum lint configuration for the current Next.js version.
- Perform a complete smoke test with a real Instagram account.

### Completion Criteria

- Unit tests, integration tests, build, and lint pass.
- The real smoke test covers connection, message receipt, and reply.
- Refreshing does not lose conversation state or notes.
- Sending failures are visible and recoverable.
- No data is shared across companies.

## Daily Schedule

| Day | Focus |
|---|---|
| 1 | Phase 1: connect a real account and validate message receipt and reply |
| 2 | Phase 1: fix integration issues, duplicates, and reconnection |
| 3 | Phase 2: sending states, failures, and retry |
| 4 | Phases 3 and 4: persistence and empty states |
| 5 | Phase 5: tests, lint, smoke test, and blocker fixes |

## Outside This Week's MVP

- `delivered` and `read` confirmations.
- WhatsApp and Facebook.
- Multiple accounts per company.
- Advanced history import.
- Attachments and voice messages.
- Quick replies.
- Team members, invitations, roles, and assignees.
- Multi-step onboarding.
- Follow-up execution and rules.
- Analytics and commercial outcomes.
- Advanced pagination and search.
- Complete mobile experience.

## Final Definition of a Functional MVP

The MVP is functional when a new company can:

1. Sign in to the application.
2. Connect an Instagram account.
3. Receive a real message in the inbox.
4. Reply and have the message reach the customer.
5. See whether the message is pending, sent, or failed.
6. Retry without duplicating the local message.
7. Change the conversation state and add an internal note.
8. Refresh the page without losing that data.
9. Remain isolated from every other company.
