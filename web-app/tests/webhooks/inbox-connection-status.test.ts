import { beforeEach, describe, expect, it, vi } from "vitest";

const { receive, createLink, registerHooks, sync } = vi.hoisted(() => ({
  receive: vi.fn(), createLink: vi.fn(), registerHooks: vi.fn(), sync: vi.fn(),
}));
vi.mock("@/app/inbox/sync.service", () => ({ inboxSyncService: { syncAccount: sync } }));

import { POST } from "../../src/app/inbox/webhooks/channel/route";
import { InboxService } from "../../src/app/inbox/inbox.service";


describe("connection status callback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(InboxService.prototype, "receiveConnectionStatus").mockImplementation(receive);
    vi.spyOn(InboxService.prototype, "createHostedAuthLink").mockImplementation(createLink);
    receive.mockResolvedValue(undefined);
    vi.spyOn(InboxService.prototype, "ensureWebhooks").mockImplementation(registerHooks);
  });

  it("only receives state; it does not create authentication, register hooks or run history import", async () => {
    const payload = { status: "CREATION_SUCCESS", account_id: "account", name: "signed-state" };
    const response = await POST(new Request("https://example.test/inbox/webhooks/channel?event=connection", {
      method: "POST", body: JSON.stringify(payload),
    }) as never);
    expect(response.status).toBe(200);
    expect(receive).toHaveBeenCalledWith(payload);
    expect(createLink).not.toHaveBeenCalled();
    expect(registerHooks).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it("rejects invalid callback state", async () => {
    receive.mockRejectedValue(new Error("Invalid state"));
    const response = await POST(new Request("https://example.test/inbox/webhooks/channel?event=connection", {
      method: "POST", body: "{}",
    }) as never);
    expect(response.status).toBe(401);
  });
});
