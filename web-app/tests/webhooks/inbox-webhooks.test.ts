import { beforeEach, describe, expect, it, vi } from "vitest";

const { database, writes, filters, account } = vi.hoisted(() => ({
  database: vi.fn(),
  writes: vi.fn(),
  filters: vi.fn(),
  account: { value: { id: "channel-1", business_id: "business-1" } as object | null },
}));
vi.mock("@db/client", () => ({ createSupabaseServiceClient: database }));

import { InboxService } from "../../src/server/inbox/inbox.service";
import { POST } from "../../src/app/inbox/webhooks/channel/route";

describe("unified inbox webhooks", () => {
  beforeEach(() => {
    vi.stubEnv("UNIPILE_WEBHOOK_SECRET", "test-webhook-secret");
    account.value = { id: "channel-1", business_id: "business-1" };
    vi.clearAllMocks();
    database.mockImplementation(() => ({
      from(table: string) {
        const chain = {
          select: () => chain,
          eq: (key: string, value: unknown) => { filters(key, value); return chain; },
          is: () => chain,
          update: (value: unknown) => { writes(table, value); return chain; },
          maybeSingle: async () => ({ data: account.value, error: null }),
          then: (resolve: (value: unknown) => void) => resolve({ error: null }),
        };
        return chain;
      },
    }));
  });

  const status = {
    AccountStatus: { account_id: "external-account", account_type: "WHATSAPP", message: "CREDENTIALS" },
  };

  it("rejects unauthenticated events before accessing the database", () => {
    expect(() => new InboxService().receiveWebhook(new Headers(), status)).toThrow("authentication failed");
    expect(database).not.toHaveBeenCalled();
  });

  it("resolves the business from the registered account and records its state", async () => {
    const headers = new Headers({ "Unipile-Auth": "test-webhook-secret" });
    await new InboxService().receiveWebhook(headers, { ...status, business_id: "forged-business" });
    expect(filters).toHaveBeenCalledWith("provider_account_id", "external-account");
    expect(filters).toHaveBeenCalledWith("platform", "whatsapp");
    expect(filters).toHaveBeenCalledWith("business_id", "business-1");
    expect(filters).not.toHaveBeenCalledWith("business_id", "forged-business");
    expect(writes).toHaveBeenCalledWith("channels", {
      connection_status: "reconnect_required", connected: false,
    });
  });

  it("accepts Instagram account status events for the Instagram channel", async () => {
    const headers = new Headers({ "Unipile-Auth": "test-webhook-secret" });
    await new InboxService().receiveWebhook(headers, {
      AccountStatus: { account_id: "instagram-account", account_type: "INSTAGRAM", message: "OK" },
    });
    expect(filters).toHaveBeenCalledWith("platform", "instagram");
    expect(writes).toHaveBeenCalledWith("channels", {
      connection_status: "connected", connected: true,
    });
  });

  it("does not assign an unknown account to an arbitrary business", async () => {
    account.value = null;
    await expect(new InboxService().receiveWebhook(
      new Headers({ "Unipile-Auth": "test-webhook-secret" }), status)).rejects.toThrow("not associated");
    expect(writes).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid webhook secret", async () => {
    const response = await POST(new Request("https://example.test/inbox/webhooks/channel", {
      method: "POST", body: JSON.stringify(status),
    }) as never);
    expect(response.status).toBe(401);
    expect(database).not.toHaveBeenCalled();
  });
});
