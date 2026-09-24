import { afterEach, describe, expect, it, vi } from "vitest";
import { InboxService } from "../../src/server/inbox/inbox.service";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("inbox webhook registration", () => {
  it("registers message and account events at the public receiver with the secret header", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "test-api-key");
    vi.stubEnv("UNIPILE_WEBHOOK_SECRET", "test-webhook-secret");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValue(Response.json({ id: "webhook" }));
    vi.stubGlobal("fetch", fetchMock);
    await new InboxService().ensureWebhooks("https://app.example.test/inbox/webhooks/channel");
    const posts = fetchMock.mock.calls.filter(([, init]) => init.method === "POST");
    expect(posts).toHaveLength(2);
    const payloads = posts.map(([, init]) => JSON.parse(init.body));
    expect(payloads.map((value) => value.source)).toEqual(["messaging", "account_status"]);
    for (const payload of payloads) {
      expect(payload.request_url).toBe("https://app.example.test/inbox/webhooks/channel");
      expect(payload.headers).toContainEqual({ key: "Unipile-Auth", value: "test-webhook-secret" });
      expect(payload.enabled).toBe(true);
    }
  });
});
