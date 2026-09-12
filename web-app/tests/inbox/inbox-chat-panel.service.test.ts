import { beforeEach, describe, expect, it, vi } from "vitest";

const { writes, providerSend, providerRead, conversationLookupError } = vi.hoisted(() => ({
  writes: vi.fn(),
  providerSend: vi.fn().mockResolvedValue({ externalMessageId: "provider-message-1" }),
  providerRead: vi.fn().mockResolvedValue(undefined),
  conversationLookupError: { value: null as null | { code: string; message: string } },
}));
vi.mock("@/app/inbox/inbox.service", () => ({
  InboxService: class {
    sendMessage = providerSend;
    markChatRead = providerRead;
  },
}));
vi.mock("@db/client", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        single: async () => table === "conversations"
          ? conversationLookupError.value
            ? { data: null, error: conversationLookupError.value }
            : { data: { channel_id: "11111111-1111-4111-8111-111111111111", channel_conversation_id: "chat-1" }, error: null }
          : { data: { provider: "unipile", provider_account_id: "account-1", connected: true }, error: null },
      };
      return chain;
    },
  })),
}));
vi.mock("@core/repository", () => ({
  BaseRepository: class {
    constructor(private options: { table: string }) {}
    async create(data: Record<string, unknown>) {
      writes(this.options.table, "create", data);
      return { id: "101", ...data };
    }
    async update(id: string, data: Record<string, unknown>) {
      writes(this.options.table, "update", { id, ...data });
    }
    async findById() { return { contact: { name: "Customer" } }; }
  },
}));

import { inboxChatPanelService } from "../../src/app/(app)/inbox/inbox-chat-panel.service";

describe("manual messaging after AI removal", () => {
  beforeEach(() => {
    writes.mockClear();
    providerSend.mockClear();
    providerRead.mockClear();
    conversationLookupError.value = null;
  });

  it("sends a manual reply and updates the conversation using only normal tables", async () => {
    const sent = await inboxChatPanelService.sendMessage("42", "Hello");
    expect(sent).toMatchObject({ id: "101", conversation_id: "42", content: "Hello", direction: "out" });
    expect(providerSend).toHaveBeenCalledWith({
      accountId: "account-1",
      externalChatId: "chat-1",
      text: "Hello",
    });
    expect(writes.mock.calls.map(([table]) => table)).toEqual(["messages", "conversations"]);
    expect(writes).toHaveBeenCalledWith("messages", "create", expect.objectContaining({
      channel_message_id: "provider-message-1",
    }));
    expect(writes).toHaveBeenLastCalledWith("conversations", "update", expect.objectContaining({ id: "42", last_message: "Hello" }));
  });

  it("keeps manual follow-up scheduling available", async () => {
    await inboxChatPanelService.scheduleFollowUp("42", "Following up", 6, "upsell");
    expect(writes).toHaveBeenCalledExactlyOnceWith("follow_ups", "create", expect.objectContaining({
      conversation_id: "42", message: "Following up", status: "scheduled", type: "upsell",
    }));
  });

  it("rejects an empty reply before writing anything", async () => {
    await expect(inboxChatPanelService.sendMessage("42", "")).rejects.toThrow();
    expect(writes).not.toHaveBeenCalled();
  });

  it("marks legacy conversations locally when provider columns are not migrated yet", async () => {
    conversationLookupError.value = { code: "42703", message: "column conversations.channel_id does not exist" };
    await expect(inboxChatPanelService.markAsRead("23")).resolves.toBeUndefined();
    expect(writes).toHaveBeenCalledWith("conversations", "update", { id: "23", unread: false });
    expect(providerRead).not.toHaveBeenCalled();
  });
});
