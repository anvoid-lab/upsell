import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxProviderError } from "@core/contracts";

const {
  events,
  providerRead,
  providerSend,
  storedMessage,
  writes,
  conversationLookupError,
} = vi.hoisted(() => ({
  events: [] as string[],
  providerSend: vi.fn(),
  providerRead: vi.fn().mockResolvedValue(undefined),
  storedMessage: { value: null as null | Record<string, unknown> },
  writes: vi.fn(),
  conversationLookupError: { value: null as null | { code: string; message: string } },
}));

vi.mock("@server/inbox/inbox.service", () => ({
  InboxService: class {
    sendMessage = (...args: unknown[]) => {
      events.push("provider:send");
      return providerSend(...args);
    };
    markChatRead = providerRead;
  },
}));

vi.mock("@core/repository", () => ({
  BaseRepository: class {
    constructor(private options: { table: string }) {}
    async create(data: Record<string, unknown>) {
      writes(this.options.table, "create", data);
      return { id: "201", ...data };
    }
    async update(id: string, data: Record<string, unknown>) {
      writes(this.options.table, "update", { id, ...data });
    }
    async findById() { return { contact: { name: "Customer" } }; }
  },
}));

vi.mock("@db/client", () => ({
  createSupabaseServerClient: vi.fn(async () => createDatabase()),
}));

import { inboxChatPanelService } from "../../src/server/inbox/inbox-chat-panel.service";

function createDatabase() {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let acceptedStatuses: string[] | null = null;
      let insertValue: Record<string, unknown> | null = null;
      let updateValue: Record<string, unknown> | null = null;

      const execute = () => {
        if (table === "conversations") {
          if (conversationLookupError.value) {
            return { data: null, error: conversationLookupError.value };
          }
          return {
            data: {
              channel_id: "11111111-1111-4111-8111-111111111111",
              channel_conversation_id: "chat-1",
            },
            error: null,
          };
        }
        if (table === "channels") {
          return {
            data: { provider: "unipile", provider_account_id: "account-1", connected: true },
            error: null,
          };
        }
        if (table !== "messages") return { data: null, error: null };

        if (insertValue) {
          events.push("database:insert-pending");
          if (
            storedMessage.value?.client_message_id === insertValue.client_message_id
          ) {
            return { data: null, error: { code: "23505", message: "duplicate client message" } };
          }
          storedMessage.value = {
            id: "101",
            ...insertValue,
          };
          return { data: storedMessage.value, error: null };
        }

        if (updateValue) {
          if (!storedMessage.value || storedMessage.value.id !== filters.id) {
            return { data: null, error: null };
          }
          if (
            acceptedStatuses &&
            !acceptedStatuses.includes(String(storedMessage.value.delivery_status))
          ) {
            return { data: null, error: null };
          }
          storedMessage.value = { ...storedMessage.value, ...updateValue };
          events.push(`database:${String(updateValue.delivery_status)}`);
          return { data: storedMessage.value, error: null };
        }

        return { data: storedMessage.value, error: null };
      };

      const chain = {
        select: () => chain,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return chain;
        },
        is: () => chain,
        in: (_key: string, values: string[]) => {
          acceptedStatuses = values;
          return chain;
        },
        insert: (value: Record<string, unknown>) => {
          insertValue = value;
          return chain;
        },
        update: (value: Record<string, unknown>) => {
          updateValue = value;
          return chain;
        },
        single: async () => execute(),
        maybeSingle: async () => execute(),
      };
      return chain;
    },
  };
}

const clientMessageId = "22222222-2222-4222-8222-222222222222";

describe("manual message delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    events.length = 0;
    storedMessage.value = null;
    conversationLookupError.value = null;
    providerSend.mockResolvedValue({ externalMessageId: "provider-message-1" });
  });

  it("persists pending before sending and returns the accepted message", async () => {
    const sent = await inboxChatPanelService.sendMessage("42", "Hello", clientMessageId);

    expect(events).toEqual([
      "database:insert-pending",
      "database:sending",
      "provider:send",
      "database:sent",
    ]);
    expect(sent).toMatchObject({
      id: "101",
      conversation_id: "42",
      content: "Hello",
      client_message_id: clientMessageId,
      channel_message_id: "provider-message-1",
      delivery_status: "sent",
    });
    expect(writes).toHaveBeenCalledWith("conversations", "update", expect.objectContaining({
      id: "42", last_message: "Hello",
    }));
  });

  it("records a confirmed provider rejection as retryable failure", async () => {
    providerSend.mockRejectedValue(new InboxProviderError("unipile", 429, "rate limited"));

    const failed = await inboxChatPanelService.sendMessage("42", "Hello", clientMessageId);

    expect(failed).toMatchObject({
      id: "101",
      delivery_status: "failed",
      delivery_error: "Instagram rate limit reached. Try again shortly.",
    });
    expect(writes).not.toHaveBeenCalledWith("conversations", "update", expect.anything());
  });

  it("does not make an ambiguous network failure retryable", async () => {
    providerSend.mockRejectedValue(new TypeError("network connection closed"));

    const pending = await inboxChatPanelService.sendMessage("42", "Hello", clientMessageId);

    expect(pending.delivery_status).toBe("sending");
  });

  it("reuses a successful message when the same client request is repeated", async () => {
    await inboxChatPanelService.sendMessage("42", "Hello", clientMessageId);
    const repeated = await inboxChatPanelService.sendMessage("42", "Hello", clientMessageId);

    expect(repeated.delivery_status).toBe("sent");
    expect(providerSend).toHaveBeenCalledTimes(1);
  });

  it("allows only one concurrent retry to claim a failed message", async () => {
    storedMessage.value = {
      id: "101",
      conversation_id: "42",
      content: "Hello",
      direction: "out",
      timestamp: new Date(),
      read: false,
      channel_id: "11111111-1111-4111-8111-111111111111",
      channel_message_id: null,
      client_message_id: clientMessageId,
      delivery_status: "failed",
      delivery_error: "Previous failure",
      delivery_updated_at: new Date(),
    };

    const results = await Promise.all([
      inboxChatPanelService.retryMessage("101"),
      inboxChatPanelService.retryMessage("101"),
    ]);

    expect(providerSend).toHaveBeenCalledTimes(1);
    expect(results.some((message) => message.delivery_status === "sent")).toBe(true);
  });

  it("keeps manual follow-up scheduling available", async () => {
    await inboxChatPanelService.scheduleFollowUp("42", "Following up", 6, "upsell");
    expect(writes).toHaveBeenCalledExactlyOnceWith("follow_ups", "create", expect.objectContaining({
      conversation_id: "42", message: "Following up", status: "scheduled", type: "upsell",
    }));
  });

  it("rejects an empty reply before writing anything", async () => {
    await expect(inboxChatPanelService.sendMessage("42", "", clientMessageId)).rejects.toThrow();
    expect(events).toEqual([]);
  });

  it("marks legacy conversations locally when provider columns are not migrated yet", async () => {
    conversationLookupError.value = { code: "42703", message: "column conversations.channel_id does not exist" };
    await expect(inboxChatPanelService.markAsRead("23")).resolves.toBeUndefined();
    expect(writes).toHaveBeenCalledWith("conversations", "update", { id: "23", unread: false });
    expect(providerRead).not.toHaveBeenCalled();
  });
});
