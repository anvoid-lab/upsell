import { afterEach, describe, expect, it, vi } from "vitest";
import { InboxService } from "../../src/server/inbox/inbox.service";
import { POST } from "../../src/app/inbox/webhooks/channel/route";

afterEach(() => vi.restoreAllMocks());

describe("channel webhook endpoint", () => {
  it("never starts authentication from a webhook action parameter", async () => {
    const connect = vi.spyOn(InboxService.prototype, "connect");
    const result = await POST(new Request("https://example.test/inbox/webhooks/channel?action=connect", {
      method: "POST", body: "{}",
    }));
    expect(result.status).toBe(401);
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects malformed callback bodies without recording state", async () => {
    const receive = vi.spyOn(InboxService.prototype, "receiveConnectionStatus");
    const result = await POST(new Request("https://example.test/inbox/webhooks/channel?event=connection", {
      method: "POST", body: "{",
    }));
    expect(result.status).toBe(400);
    expect(receive).not.toHaveBeenCalled();
  });

  it("limits callback body size before recording state", async () => {
    const receive = vi.spyOn(InboxService.prototype, "receiveConnectionStatus");
    const result = await POST(new Request("https://example.test/inbox/webhooks/channel?event=connection", {
      method: "POST", body: "x".repeat(256 * 1024 + 1),
    }));
    expect(result.status).toBe(413);
    expect(receive).not.toHaveBeenCalled();
  });
});
