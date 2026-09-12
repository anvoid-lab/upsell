import "server-only";

import { timingSafeEqual } from "node:crypto";
import {
  InboxContract,
  InboxProviderError,
  type HostedAuthRequest,
  type InboxChannel,
  type InboxConnectionStatus,
  type InboxProvider,
  type ProviderAccount,
  type ProviderChat,
  type ProviderEvent,
  type ProviderStoredMessage,
} from "@core/contracts/inbox.contract";

/*
 * Unipile implementation. Contracts and payload validation are defined in core/contracts/inbox.contract.
 */
function config() {
  const apiUrl = process.env.UNIPILE_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.UNIPILE_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error("UNIPILE_API_URL and UNIPILE_API_KEY must be configured on the server.");
  }
  return { apiUrl, apiKey };
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const { apiUrl, apiKey } = config();
  const response = await fetch(`${apiUrl}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-API-KEY": apiKey,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "message" in body
      ? String(body.message)
      : `Unipile request failed (${response.status})`;
    throw new InboxProviderError("unipile", response.status, detail);
  }
  return body;
}

function accountStatus(value: string | undefined): InboxConnectionStatus {
  switch (value?.toUpperCase()) {
    case "OK":
    case "SYNC_SUCCESS": return "connected";
    case "CREATION_SUCCESS":
    case "RECONNECTED":
    case "CONNECTING": return "syncing";
    case "CREDENTIALS":
    case "PERMISSIONS": return "reconnect_required";
    case "DELETED": return "disconnected";
    case "CREATION_FAIL":
    case "ERROR":
    case "STOPPED": return "error";
    default: return "connecting";
  }
}

function sourcesStatus(values: string[]): InboxConnectionStatus {
  const statuses = values.map((value) => value.toUpperCase());
  if (statuses.some((value) => value === "CREDENTIALS" || value === "PERMISSIONS")) return "reconnect_required";
  if (statuses.some((value) => value === "ERROR" || value === "STOPPED")) return "error";
  if (statuses.length && statuses.every((value) => value === "OK")) return "connected";
  return "syncing";
}

const UNIPILE_CHANNELS: Record<InboxChannel, string> = {
  whatsapp: "WHATSAPP",
  instagram: "INSTAGRAM",
};

function parseChannel(value: string): InboxChannel | null {
  const normalized = value.toUpperCase();
  if (normalized === "WHATSAPP") return "whatsapp";
  if (normalized === "INSTAGRAM") return "instagram";
  return null;
}

function channelLabel(channel: InboxChannel): string {
  return channel === "whatsapp" ? "WhatsApp" : "Instagram";
}

export class UnipileInboxProvider implements InboxProvider {
  readonly name = "unipile" as const;

  async ensureWebhooks(requestUrl: string): Promise<void> {
    const existing = InboxContract.unipile.webhookListSchema.parse(await request("/webhooks?limit=250"));
    const secret = process.env.UNIPILE_WEBHOOK_SECRET;
    if (!secret) throw new Error("UNIPILE_WEBHOOK_SECRET must be configured on the server.");
    const headers = [
      { key: "Content-Type", value: "application/json" },
      { key: "Unipile-Auth", value: secret },
    ];
    const definitions = [
      { source: "messaging", events: ["message_received"] },
      {
        source: "account_status",
        events: ["creation_success", "creation_fail", "deleted", "reconnected", "sync_success", "stopped", "ok", "connecting", "error", "credentials", "permissions"],
      },
    ];
    for (const definition of definitions) {
      if (existing.items.some((item) => item.request_url === requestUrl && item.source === definition.source)) continue;
      await request("/webhooks", {
        method: "POST",
        body: JSON.stringify({
          ...definition,
          request_url: requestUrl,
          name: `vendai-${definition.source}`,
          format: "json",
          enabled: true,
          headers,
        }),
      });
    }
  }

  async listChats(accountId: string, channel: InboxChannel): Promise<ProviderChat[]> {
    const chats: ProviderChat[] = [];
    let cursor: string | null | undefined;
    const seen = new Set<string>();
    do {
      const accountType = UNIPILE_CHANNELS[channel];
      const query = new URLSearchParams({ account_id: accountId, account_type: accountType, limit: "250" });
      if (cursor) query.set("cursor", cursor);
      const page = InboxContract.unipile.chatListSchema.parse(await request(`/chats?${query}`));
      for (const chat of page.items) {
        if (chat.account_type.toUpperCase() !== accountType) continue;
        chats.push({
          externalChatId: chat.id,
          participantId: chat.attendee_provider_id ?? chat.provider_id ?? chat.id,
          name: chat.name?.trim() || `${channelLabel(channel)} contact`,
          unread: chat.unread_count > 0,
          occurredAt: chat.timestamp ? new Date(chat.timestamp) : null,
        });
      }
      cursor = page.cursor;
      if (cursor && seen.has(cursor)) throw new Error("Unipile chat pagination repeated a cursor.");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return chats;
  }

  async listMessages(externalChatId: string): Promise<ProviderStoredMessage[]> {
    const messages: ProviderStoredMessage[] = [];
    let cursor: string | null | undefined;
    const seen = new Set<string>();
    do {
      const query = new URLSearchParams({ limit: "250" });
      if (cursor) query.set("cursor", cursor);
      const page = InboxContract.unipile.storedMessageListSchema.parse(await request(
        `/chats/${encodeURIComponent(externalChatId)}/messages?${query}`,
      ));
      for (const message of page.items) {
        messages.push({
          externalMessageId: message.id,
          text: message.text || (message.attachments.length ? "Attachment" : "Message"),
          direction: Boolean(message.is_sender) ? "out" : "in",
          occurredAt: message.timestamp,
        });
      }
      cursor = page.cursor;
      if (cursor && seen.has(cursor)) throw new Error("Unipile message pagination repeated a cursor.");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return messages;
  }

  async createHostedAuthLink(input: HostedAuthRequest): Promise<string> {
    const { apiUrl } = config();
    const reconnecting = Boolean(input.reconnectAccountId);
    const payload = {
      type: reconnecting ? "reconnect" : "create",
      ...(reconnecting
        ? { reconnect_account: input.reconnectAccountId }
        : { providers: [UNIPILE_CHANNELS[input.channel]] }),
      ...(input.channel === "instagram" ? { disabled_options: ["proxy"] } : {}),
      api_url: apiUrl,
      expiresOn: new Date(Date.now() + 10 * 60_000).toISOString(),
      notify_url: input.notifyUrl,
      success_redirect_url: input.successRedirectUrl,
      failure_redirect_url: input.failureRedirectUrl,
      name: input.state,
    };
    return InboxContract.unipile.hostedLinkSchema.parse(await request("/hosted/accounts/link", {
      method: "POST",
      body: JSON.stringify(payload),
    })).url;
  }

  async getAccount(accountId: string): Promise<ProviderAccount> {
    const raw = InboxContract.unipile.accountSchema.parse(await request(`/accounts/${encodeURIComponent(accountId)}`));
    const channel = parseChannel(raw.type);
    if (!channel) throw new Error("The connected account uses an unsupported channel.");
    return {
      id: raw.id,
      channel,
      name: raw.name ?? raw.identifier ?? null,
      status: sourcesStatus(raw.sources?.map((source) => source.status) ?? []),
      metadata: raw,
    };
  }

  async disconnectAccount(accountId: string): Promise<void> {
    await request(`/accounts/${encodeURIComponent(accountId)}`, { method: "DELETE" });
  }

  async sendMessage(input: { accountId: string; externalChatId: string; text: string }) {
    const form = new FormData();
    form.set("text", input.text);
    form.set("account_id", input.accountId);
    const body = InboxContract.unipile.sendResponseSchema.parse(await request(
      `/chats/${encodeURIComponent(input.externalChatId)}/messages`,
      { method: "POST", body: form },
    ));
    return { externalMessageId: body.message_id };
  }

  async markChatRead(input: { accountId: string; externalChatId: string }): Promise<void> {
    await request(`/chats/${encodeURIComponent(input.externalChatId)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "setReadStatus", value: true, account_id: input.accountId }),
    });
  }

  verifyWebhook(headers: Headers): boolean {
    const expected = process.env.UNIPILE_WEBHOOK_SECRET;
    const received = headers.get("unipile-auth");
    if (!expected || !received) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhook(payload: unknown): ProviderEvent | null {
    const account = InboxContract.unipile.accountStatusSchema.safeParse(payload);
    const accountChannel = account.success ? parseChannel(account.data.AccountStatus.account_type) : null;
    if (account.success && accountChannel) {
      return {
        type: "account_status",
        providerAccountId: account.data.AccountStatus.account_id,
        channel: accountChannel,
        status: accountStatus(account.data.AccountStatus.message),
      };
    }

    const parsed = InboxContract.unipile.messageEventSchema.safeParse(payload);
    if (!parsed.success) return null;
    const channel = parseChannel(parsed.data.account_type);
    if (!channel) return null;
    if (parsed.data.event !== "message_received") return null;
    const ownerId = parsed.data.account_info?.user_id;
    const senderId = parsed.data.sender.attendee_provider_id ?? parsed.data.sender.attendee_id ?? "unknown";
    return {
      type: "message",
      channel,
      providerAccountId: parsed.data.account_id,
      externalChatId: parsed.data.chat_id,
      externalMessageId: parsed.data.message_id,
      occurredAt: parsed.data.timestamp,
      text: parsed.data.message || "Attachment",
      direction: ownerId && ownerId === senderId ? "out" : "in",
      sender: { id: senderId, name: parsed.data.sender.attendee_name ?? `${channelLabel(channel)} contact` },
    };
  }
}
