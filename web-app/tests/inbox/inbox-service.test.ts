import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: vi.fn(), serviceClient: vi.fn(), getUser: vi.fn(), filters: vi.fn(),
  writes: vi.fn(), sync: vi.fn(),
  row: { id: "22222222-2222-4222-8222-222222222222", business_id: "11111111-1111-4111-8111-111111111111",
    provider: "unipile", provider_account_id: "account-1", connection_status: "connected" },
}));
vi.mock("@db/client", () => ({
  createSupabaseServerClient: mocks.client, createSupabaseServiceClient: mocks.serviceClient,
}));
vi.mock("@/app/inbox/sync.service", () => ({ inboxSyncService: { syncAccount: mocks.sync } }));
import { InboxService } from "../../src/app/inbox/inbox.service";
import { UnipileInboxProvider } from "../../src/app/inbox/providers/unipile";
import { createHostedAuthState, verifyHostedAuthState } from "../../src/app/inbox/hosted-auth-state";

beforeEach(() => {
  vi.stubEnv("INBOX_HOSTED_AUTH_SECRET", "a".repeat(64));
  vi.stubEnv("APP_URL", "https://example.test");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  const db = {
    auth: { getUser: mocks.getUser },
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: (key: string, value: unknown) => { mocks.filters(table, key, value); return chain; },
        is: () => chain,
        update: (value: unknown) => { mocks.writes(table, value); return chain; },
        single: async () => ({ data: mocks.row, error: null }),
        maybeSingle: async () => ({ data: mocks.row, error: null }),
        then: (resolve: (value: unknown) => void) => resolve({ data: mocks.row, error: null }),
      };
      return chain;
    },
  };
  mocks.client.mockResolvedValue(db);
  mocks.serviceClient.mockReturnValue(db);
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe("InboxService integration", () => {
  it("rejects every user operation without a valid session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const register = vi.spyOn(UnipileInboxProvider.prototype, "ensureWebhooks");
    const service = new InboxService();
    for (const run of [() => service.connect(), () => service.disconnect(), () => service.syncHistory(), () => service.connectionStatus()]) {
      await expect(run()).rejects.toThrow("Invalid session");
    }
    expect(register).not.toHaveBeenCalled();
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("registers the receiver before returning a signed Hosted Auth link", async () => {
    const register = vi.spyOn(UnipileInboxProvider.prototype, "ensureWebhooks").mockResolvedValue();
    const create = vi.spyOn(UnipileInboxProvider.prototype, "createHostedAuthLink")
      .mockResolvedValue("https://account.example.test/link");
    expect(await new InboxService().connect()).toBe("https://account.example.test/link");
    expect(register).toHaveBeenCalledWith("https://example.test/inbox/webhooks/channel");
    const input = create.mock.calls[0][0];
    expect(input.notifyUrl).toBe("https://example.test/inbox/webhooks/channel?event=connection");
    expect(input.channel).toBe("whatsapp");
    expect(input.successRedirectUrl).toBe("https://example.test/inbox/integration?channel=whatsapp&result=success");
    expect(await verifyHostedAuthState(input.state)).toMatchObject({
      businessId: mocks.row.business_id, channelId: mocks.row.id, provider: "unipile",
    });
    expect(register.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
  });

  it("creates a channel-specific Instagram Hosted Auth flow", async () => {
    vi.spyOn(UnipileInboxProvider.prototype, "ensureWebhooks").mockResolvedValue();
    const create = vi.spyOn(UnipileInboxProvider.prototype, "createHostedAuthLink")
      .mockResolvedValue("https://account.example.test/instagram");
    await new InboxService().connect("instagram");
    expect(mocks.filters).toHaveBeenCalledWith("channels", "platform", "instagram");
    const input = create.mock.calls[0][0];
    expect(input.channel).toBe("instagram");
    expect(input.successRedirectUrl).toContain("channel=instagram");
    expect(await verifyHostedAuthState(input.state)).toMatchObject({ channel: "instagram" });
  });

  it("reads progress only for the authenticated business and selected provider", async () => {
    expect(await new InboxService().connectionStatus()).toBe("connected");
    expect(mocks.filters).toHaveBeenCalledWith("channels", "business_id", mocks.row.business_id);
    expect(mocks.filters).toHaveBeenCalledWith("channels", "provider", "unipile");
  });

  it("binds the callback to the signed channel and ignores a supplied business ID", async () => {
    vi.spyOn(UnipileInboxProvider.prototype, "getAccount").mockResolvedValue({
      id: "account-1", channel: "whatsapp", name: "Store", status: "connected", metadata: {},
    });
    const register = vi.spyOn(UnipileInboxProvider.prototype, "ensureWebhooks");
    const name = await createHostedAuthState(mocks.row.business_id, mocks.row.id, "unipile", "whatsapp");
    await new InboxService().receiveConnectionStatus({
      status: "CREATION_SUCCESS", account_id: "account-1", name, business_id: "forged",
    });
    expect(mocks.filters).toHaveBeenCalledWith("channels", "id", mocks.row.id);
    expect(mocks.filters).toHaveBeenCalledWith("channels", "business_id", mocks.row.business_id);
    expect(mocks.filters).not.toHaveBeenCalledWith("channels", "business_id", "forged");
    expect(register).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("rejects invalid callback state before contacting the provider", async () => {
    const account = vi.spyOn(UnipileInboxProvider.prototype, "getAccount");
    await expect(new InboxService().receiveConnectionStatus({
      status: "CREATION_SUCCESS", account_id: "account-1", name: "invalid",
    })).rejects.toThrow();
    expect(account).not.toHaveBeenCalled();
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it("disconnects the scoped provider account before clearing its local association", async () => {
    const disconnect = vi.spyOn(UnipileInboxProvider.prototype, "disconnectAccount").mockResolvedValue();
    await new InboxService().disconnect();
    expect(disconnect).toHaveBeenCalledWith("account-1");
    expect(mocks.writes).toHaveBeenCalledWith("channels", expect.objectContaining({
      provider_account_id: null, connection_status: "disconnected", connected: false,
    }));
  });

  it("passes the selected provider to history import after authorization", async () => {
    await new InboxService().syncHistory();
    expect(mocks.sync).toHaveBeenCalledWith(expect.any(UnipileInboxProvider), "account-1", "whatsapp");
  });
});
