import { beforeEach, describe, expect, it, vi } from "vitest";

const { writes } = vi.hoisted(() => ({ writes: vi.fn() }));
vi.mock("@db/client", () => ({ createSupabaseServerClient: vi.fn() }));
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
  beforeEach(() => writes.mockClear());

  it("sends a manual reply and updates the conversation using only normal tables", async () => {
    const sent = await inboxChatPanelService.sendMessage("42", "Hello");
    expect(sent).toMatchObject({ id: "101", conversation_id: "42", content: "Hello", direction: "out" });
    expect(writes.mock.calls.map(([table]) => table)).toEqual(["messages", "conversations"]);
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
});
