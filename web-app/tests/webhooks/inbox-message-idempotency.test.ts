import { beforeEach, describe, expect, it, vi } from "vitest";

const { database, conversations, messages } = vi.hoisted(() => ({
  database: vi.fn(),
  conversations: new Map<string, { id: string }>(),
  messages: new Map<string, Record<string, unknown>>(),
}));

vi.mock("@db/client", () => ({ createSupabaseServiceClient: database }));

import { InboxService } from "../../src/server/inbox/inbox.service";

type Operation =
  | { type: "select" }
  | { type: "insert"; value: Record<string, unknown> }
  | { type: "update"; value: Record<string, unknown> };

function createDatabase() {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let operation: Operation = { type: "select" };
      let executed = false;
      let result: { data?: unknown; error: null | { code: string; message: string } };

      const execute = () => {
        if (executed) return result;
        executed = true;

        if (operation.type === "insert" && table === "conversations") {
          const externalChatId = String(operation.value.channel_conversation_id);
          if (conversations.has(externalChatId)) {
            result = { data: null, error: { code: "23505", message: "duplicate conversation" } };
          } else {
            const row = { id: String(conversations.size + 1) };
            conversations.set(externalChatId, row);
            result = { data: row, error: null };
          }
          return result;
        }

        if (operation.type === "insert" && table === "messages") {
          const key = `${operation.value.channel_id}:${operation.value.channel_message_id}`;
          if (messages.has(key)) {
            result = { data: null, error: { code: "23505", message: "duplicate message" } };
          } else {
            messages.set(key, operation.value);
            result = { data: operation.value, error: null };
          }
          return result;
        }

        result = { data: null, error: null };
        return result;
      };

      const chain = {
        select: () => chain,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return chain;
        },
        is: () => chain,
        insert: (value: Record<string, unknown>) => {
          operation = { type: "insert", value };
          return chain;
        },
        update: (value: Record<string, unknown>) => {
          operation = { type: "update", value };
          return chain;
        },
        maybeSingle: async () => {
          if (table === "channels") {
            return { data: { id: "channel-1", business_id: "business-1" }, error: null };
          }
          if (table === "conversations") {
            return {
              data: conversations.get(String(filters.channel_conversation_id)) ?? null,
              error: null,
            };
          }
          return execute();
        },
        single: async () => {
          if (operation.type === "insert") return execute();
          if (table === "conversations") {
            return {
              data: conversations.get(String(filters.channel_conversation_id)) ?? null,
              error: null,
            };
          }
          return execute();
        },
        then: (resolve: (value: unknown) => void) => Promise.resolve(execute()).then(resolve),
      };
      return chain;
    },
  };
}

const event = {
  event: "message_received",
  account_id: "instagram-account",
  account_type: "INSTAGRAM",
  account_info: { user_id: "store" },
  chat_id: "instagram-chat",
  message_id: "instagram-message",
  timestamp: "2026-09-12T09:00:00Z",
  message: "Hello",
  sender: { attendee_provider_id: "customer", attendee_name: "Customer" },
};

describe("Instagram webhook message idempotency", () => {
  beforeEach(() => {
    vi.stubEnv("UNIPILE_WEBHOOK_SECRET", "test-webhook-secret");
    conversations.clear();
    messages.clear();
    database.mockReturnValue(createDatabase());
  });

  it("stores a repeated provider delivery only once", async () => {
    const service = new InboxService();
    const headers = new Headers({ "Unipile-Auth": "test-webhook-secret" });

    expect(await service.receiveWebhook(headers, event)).toBe("accepted");
    expect(await service.receiveWebhook(headers, event)).toBe("duplicate");
    expect(conversations).toHaveLength(1);
    expect(messages).toHaveLength(1);
  });

  it("reuses the winning conversation when first-message deliveries race", async () => {
    const service = new InboxService();
    const headers = new Headers({ "Unipile-Auth": "test-webhook-secret" });

    const results = await Promise.all([
      service.receiveWebhook(headers, event),
      service.receiveWebhook(headers, event),
    ]);

    expect(results.sort()).toEqual(["accepted", "duplicate"]);
    expect(conversations).toHaveLength(1);
    expect(messages).toHaveLength(1);
  });
});
