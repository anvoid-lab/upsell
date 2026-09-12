import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UnipileInboxProvider } from "../../src/app/inbox/providers/unipile";

describe("Unipile inbox provider", () => {
  beforeEach(() => {
    vi.stubEnv("UNIPILE_WEBHOOK_SECRET", "a-secret-at-least-thirty-two-characters-long");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps automatic proxy selection and disables custom proxies for Instagram", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ url: "https://account.example.test/link" }));
    vi.stubGlobal("fetch", fetchMock);

    await new UnipileInboxProvider().createHostedAuthLink({
      channel: "instagram",
      state: "signed-state",
      notifyUrl: "https://app.example.test/inbox/webhooks/channel?event=connection",
      successRedirectUrl: "https://app.example.test/inbox/integration?result=success",
      failureRedirectUrl: "https://app.example.test/inbox/integration?result=error",
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload).toMatchObject({
      providers: ["INSTAGRAM"],
      disabled_options: ["proxy"],
    });
    expect(payload).not.toHaveProperty("proxy");
  });

  it("normalizes an inbound WhatsApp message", () => {
    const event = new UnipileInboxProvider().parseWebhook({
      event: "message_received",
      account_id: "account-1",
      account_type: "WHATSAPP",
      account_info: { user_id: "owner" },
      chat_id: "chat-1",
      message_id: "message-1",
      timestamp: "2026-09-11T20:00:00Z",
      message: "Hello",
      sender: { attendee_provider_id: "customer", attendee_name: "Maria" },
    });
    expect(event).toMatchObject({
      type: "message",
      channel: "whatsapp",
      providerAccountId: "account-1",
      externalChatId: "chat-1",
      externalMessageId: "message-1",
      direction: "in",
      text: "Hello",
      sender: { id: "customer", name: "Maria" },
    });
  });

  it("normalizes an inbound Instagram message", () => {
    const event = new UnipileInboxProvider().parseWebhook({
      event: "message_received",
      account_id: "instagram-account",
      account_type: "INSTAGRAM",
      account_info: { user_id: "store" },
      chat_id: "instagram-chat",
      message_id: "instagram-message",
      timestamp: "2026-09-12T09:00:00Z",
      message: "Hello",
      sender: { attendee_provider_id: "customer", attendee_name: "Customer" },
    });
    expect(event).toMatchObject({
      type: "message",
      channel: "instagram",
      providerAccountId: "instagram-account",
      direction: "in",
    });
  });

  it("normalizes messages sent from another device as outbound", () => {
    const event = new UnipileInboxProvider().parseWebhook({
      event: "message_received",
      account_id: "account-1",
      account_type: "WHATSAPP",
      account_info: { user_id: "owner" },
      chat_id: "chat-1",
      message_id: "message-2",
      timestamp: "2026-09-11T20:00:00Z",
      message: "Resposta",
      sender: { attendee_provider_id: "owner", attendee_name: "Loja" },
    });
    expect(event).toMatchObject({ type: "message", direction: "out" });
  });

  it("rejects a webhook with the wrong shared secret", () => {
    const headers = new Headers({ "Unipile-Auth": "wrong" });
    expect(new UnipileInboxProvider().verifyWebhook(headers)).toBe(false);
  });
});
