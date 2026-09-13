import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UnipileInboxProvider } from "../../src/server/inbox/providers/unipile";

describe("Unipile inbox provider", () => {
  beforeEach(() => {
    vi.stubEnv(
      "UNIPILE_WEBHOOK_SECRET",
      "a-secret-at-least-thirty-two-characters-long",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps automatic proxy selection and disables custom proxies for Instagram", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ url: "https://account.example.test/link" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await new UnipileInboxProvider().createHostedAuthLink({
      channel: "instagram",
      state: "signed-state",
      notifyUrl:
        "https://app.example.test/inbox/webhooks/channel?event=connection",
      successRedirectUrl:
        "https://app.example.test/inbox/integration?result=success",
      failureRedirectUrl:
        "https://app.example.test/inbox/integration?result=error",
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload).toMatchObject({
      providers: ["INSTAGRAM"],
      disabled_options: ["proxy"],
    });
    expect(payload).not.toHaveProperty("proxy");
  });

  it("creates an Instagram reconnect link for an existing provider account", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ url: "https://account.example.test/reconnect" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await new UnipileInboxProvider().createHostedAuthLink({
      channel: "instagram",
      state: "signed-state",
      reconnectAccountId: "instagram-account",
      notifyUrl:
        "https://app.example.test/inbox/webhooks/channel?event=connection",
      successRedirectUrl:
        "https://app.example.test/inbox/integration?channel=instagram&result=success",
      failureRedirectUrl:
        "https://app.example.test/inbox/integration?channel=instagram&result=error",
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload).toMatchObject({
      type: "reconnect",
      reconnect_account: "instagram-account",
    });
    expect(payload).not.toHaveProperty("providers");
  });

  it("loads the provider identity of the connected account owner", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          id: "unipile-account",
          type: "INSTAGRAM",
          name: "Store",
          sources: [{ status: "OK" }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          provider_id: "instagram-user-1",
          public_identifier: "store",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new UnipileInboxProvider();
    const account = await provider.getAccount("unipile-account");
    const identity = await provider.getAccountIdentity("unipile-account");

    expect(account.id).toBe("unipile-account");
    expect(identity).toBe("instagram-user-1");
    expect(fetchMock.mock.calls[1][0]).toContain(
      "/users/me?account_id=unipile-account",
    );
  });

  it("loads the attendee picture instead of the social profile URL", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    const avatarUrl =
      "https://scontent-lis1-1.cdninstagram.com/profile-picture.jpg";
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        picture_url: avatarUrl,
        profile_url: "https://www.instagram.com/rosa.rioprive/",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new UnipileInboxProvider().getAttendeeAvatar(
      "instagram-account",
      "attendee-1",
    );

    expect(result).toBe(avatarUrl);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/chat_attendees/attendee-1?account_id=instagram-account",
    );
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
      sender: {
        attendee_id: "attendee-1",
        attendee_provider_id: "customer",
        attendee_name: "Customer",
        attendee_profile_url: "https://scontent-lis1-1.cdninstagram.com/avatar.jpg",
      },
    });
    expect(event).toMatchObject({
      type: "message",
      channel: "instagram",
      providerAccountId: "instagram-account",
      direction: "in",
      sender: {
        id: "customer",
        name: "Customer",
        attendeeId: "attendee-1",
      },
    });
  });

  it("normalizes all attachment metadata from a media webhook", () => {
    const event = new UnipileInboxProvider().parseWebhook({
      event: "message_received",
      account_id: "instagram-account",
      account_type: "INSTAGRAM",
      account_info: { user_id: "store" },
      chat_id: "instagram-chat",
      message_id: "instagram-media",
      timestamp: "2026-09-12T09:00:00Z",
      message: "",
      sender: { attendee_provider_id: "customer", attendee_name: "Customer" },
      attachments: [
        {
          id: "attachment-1",
          url: "https://cdn.example.test/photo.jpg",
          mimetype: "image/jpeg",
          type: "img",
          size: { width: "1080", height: "1350", bytes: "2048" },
          sticker: false,
          unavailable: false,
          provider_extra: "kept",
        },
      ],
    });

    expect(event).toMatchObject({
      type: "message",
      text: "",
      attachments: [{
        external_id: "attachment-1",
        media_url: "https://cdn.example.test/photo.jpg",
        type: "image",
        mime_type: "image/jpeg",
        size_bytes: 2048,
        width: 1080,
        height: 1350,
        unavailable: false,
        metadata: { sticker: false, provider_extra: "kept" },
      }],
    });
  });

  it("sends multiple attachments through the v1 multipart endpoint", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message_id: "message-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const first = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    const second = new File(["video"], "clip.mp4", { type: "video/mp4" });

    await new UnipileInboxProvider().sendMessage({
      accountId: "account-1",
      externalChatId: "chat-1",
      text: "Products",
      attachments: [
        { content: first, filename: first.name, mimeType: first.type },
        { content: second, filename: second.name, mimeType: second.type },
      ],
    });

    const request = fetchMock.mock.calls[0][1];
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/chats/chat-1/messages");
    expect(request.body).toBeInstanceOf(FormData);
    expect(request.body.get("text")).toBe("Products");
    expect(request.body.getAll("attachments")).toHaveLength(2);
  });

  it("uses the canonical message direction and exposes the provider CDN URL", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    const cdnUrl = "https://scontent.example.test/photo.webp?token=abc";
    const encodedUrl = Buffer.from(cdnUrl).toString("base64url");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      id: "message-1",
      text: "You sent a photo.",
      timestamp: "2026-09-13T13:01:48.497Z",
      is_sender: 1,
      attachments: [{
        id: "attachment-1",
        url: `att://account-1/${encodedUrl}/attachment-1`,
        type: "img",
        mimetype: "image/webp",
      }],
    })));

    const message = await new UnipileInboxProvider().getMessage("message-1");

    expect(message).toMatchObject({
      direction: "out",
      text: "",
      attachments: [{ media_url: cdnUrl, type: "image" }],
    });
  });

  it("normalizes replies, receipts, visibility and reactions from a canonical message", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      id: "reply-1",
      text: "This one",
      timestamp: "2026-09-13T13:05:00Z",
      is_sender: 0,
      seen: 1,
      delivered: 1,
      hidden: 0,
      deleted: 0,
      edited: 1,
      attachments: [],
      quoted: {
        message_id: "original-1",
        text: "Which product?",
        attachments: [],
      },
      reactions: [{ value: "❤", sender_id: "customer", is_sender: false }],
    })));

    const message = await new UnipileInboxProvider().getMessage("reply-1");

    expect(message).toMatchObject({
      direction: "in",
      delivered: true,
      seen: true,
      hidden: false,
      deleted: false,
      edited: true,
      quotedMessage: {
        externalMessageId: "original-1",
        text: "Which product?",
      },
      reactions: [{ value: "❤", senderId: "customer", direction: "in" }],
    });
  });

  it("normalizes message receipt and mutation webhooks", () => {
    const provider = new UnipileInboxProvider();
    const base = {
      account_id: "account-1",
      account_type: "INSTAGRAM",
      chat_id: "chat-1",
      message_id: "message-1",
      timestamp: "2026-09-13T13:05:00Z",
    };

    expect(provider.parseWebhook({ ...base, event: "message_read" })).toMatchObject({
      type: "message_mutation",
      mutation: "read",
      externalMessageId: "message-1",
    });
    expect(provider.parseWebhook({ ...base, event: "message_reaction" })).toMatchObject({
      type: "message_mutation",
      mutation: "reaction",
    });
  });

  it("hides provider reaction helper events from the conversation", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      id: "reaction-helper-1",
      text: "Reacted 😡 to your message",
      timestamp: "2026-09-13T13:05:00Z",
      is_sender: 0,
      is_event: 1,
      event_type: 0,
      hidden: 0,
      attachments: [],
      reactions: [],
    })));

    const message = await new UnipileInboxProvider().getMessage("reaction-helper-1");

    expect(message.hidden).toBe(true);
    expect(message.metadata).toMatchObject({ is_event: 1, event_type: 0 });
  });

  it("treats an accepted response without a message id as sent", async () => {
    vi.stubEnv("UNIPILE_API_URL", "https://api.example.test");
    vi.stubEnv("UNIPILE_API_KEY", "api-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true })));

    await expect(new UnipileInboxProvider().sendMessage({
      accountId: "account-1",
      externalChatId: "chat-1",
      text: "Hello",
      attachments: [],
    })).resolves.toEqual({ externalMessageId: null });
  });

  it("maps expired Instagram credentials to reconnect required", () => {
    const event = new UnipileInboxProvider().parseWebhook({
      AccountStatus: {
        account_id: "instagram-account",
        account_type: "INSTAGRAM",
        message: "CREDENTIALS",
      },
    });

    expect(event).toMatchObject({
      type: "account_status",
      channel: "instagram",
      providerAccountId: "instagram-account",
      status: "reconnect_required",
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
