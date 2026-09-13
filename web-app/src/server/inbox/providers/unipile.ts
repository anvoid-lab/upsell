import "server-only";

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  InboxProviderError,
  type HostedAuthRequest,
  type InboxChannel,
  type InboxConnectionStatus,
  type InboxProvider,
  type ProviderAccount,
  type ProviderChat,
  type ProviderEvent,
  type NormalizedInboxMessage,
} from "@core/contracts/inbox.contract";
import type { MessageAttachment, MessageAttachmentType } from "@core/contracts/message.contract";

// Provider response schemas stay private to this adapter. The rest of the inbox
// only consumes the normalized contracts exported by core/contracts.
const attachmentSchema = z.object({
  id: z.string().nullish(),
  url: z.string().nullish(),
  type: z.string().nullish(),
  mimetype: z.string().nullish(),
  filename: z.string().nullish(),
  name: z.string().nullish(),
  file_size: z.coerce.number().nonnegative().nullish(),
  size: z.union([
    z.coerce.number().nonnegative(),
    z.object({
      width: z.coerce.number().nonnegative().nullish(),
      height: z.coerce.number().nonnegative().nullish(),
      bytes: z.coerce.number().nonnegative().nullish(),
    }).passthrough(),
  ]).nullish(),
  sticker: z.boolean().nullish(),
  unavailable: z.boolean().nullish(),
}).passthrough();

const hostedLinkSchema = z.object({ url: z.string().url() });
const sendResponseSchema = z.object({ message_id: z.string().min(1).optional() }).passthrough();
const accountSchema = z.object({
  id: z.string().min(1), type: z.string(), name: z.string().nullish(),
  identifier: z.string().nullish(),
  connection_params: z.record(z.string(), z.unknown()).optional(),
  sources: z.array(z.object({ status: z.string() }).passthrough()).optional(),
}).passthrough();
const userProfileSchema = z.object({ provider_id: z.string().min(1) }).passthrough();
const attendeeSchema = z.object({ picture_url: z.string().url().nullish() }).passthrough();
const messageEventSchema = z.object({
  event: z.string(), account_id: z.string().min(1), account_type: z.string(),
  account_info: z.object({ user_id: z.string().optional() }).passthrough().optional(),
  chat_id: z.string().min(1), message_id: z.string().min(1),
  timestamp: z.coerce.date(), message: z.string().default(""),
  attachments: z.array(attachmentSchema).default([]),
  sender: z.object({
    attendee_id: z.string().optional(), attendee_provider_id: z.string().optional(),
    attendee_name: z.string().optional(), attendee_profile_url: z.string().url().optional(),
  }).passthrough(),
}).passthrough();
const messageMutationEventSchema = z.object({
  event: z.enum([
    "message_read",
    "message_delivered",
    "message_edited",
    "message_deleted",
    "message_reaction",
  ]),
  account_id: z.string().min(1),
  account_type: z.string(),
  chat_id: z.string().min(1),
  message_id: z.string().min(1),
  timestamp: z.coerce.date(),
}).passthrough();
const accountStatusSchema = z.object({ AccountStatus: z.object({
  account_id: z.string().min(1), account_type: z.string(), message: z.string(),
}) });
const webhookListSchema = z.object({ items: z.array(
  z.object({
    id: z.string(), request_url: z.string(), source: z.string(),
    events: z.array(z.string()).default([]),
  }).passthrough(),
) }).passthrough();
const chatListSchema = z.object({
  items: z.array(z.object({
    id: z.string(), account_type: z.string(), attendee_provider_id: z.string().optional(),
    provider_id: z.string().optional(), name: z.string().nullish(),
    timestamp: z.string().nullish(), unread_count: z.number().default(0),
  }).passthrough()),
  cursor: z.string().nullish(),
}).passthrough();
const storedMessageListSchema = z.object({
  items: z.array(z.object({
    id: z.string(), text: z.string().nullish(), timestamp: z.coerce.date(),
    is_sender: z.union([z.boolean(), z.number()]),
    attachments: z.array(attachmentSchema).default([]),
    seen: z.union([z.boolean(), z.number()]).nullish(),
    delivered: z.union([z.boolean(), z.number()]).nullish(),
    hidden: z.union([z.boolean(), z.number()]).nullish(),
    deleted: z.union([z.boolean(), z.number()]).nullish(),
    edited: z.union([z.boolean(), z.number()]).nullish(),
    is_event: z.union([z.boolean(), z.number()]).nullish(),
    event_type: z.union([z.string(), z.number()]).nullish(),
    quoted: z.unknown().nullish(),
    reactions: z.array(z.object({
      value: z.string(), sender_id: z.string().nullish(),
      is_sender: z.union([z.boolean(), z.number()]).nullish(),
      timestamp: z.coerce.date().nullish(),
    }).passthrough()).default([]),
  }).passthrough()),
  cursor: z.string().nullish(),
}).passthrough();
const storedMessageSchema = storedMessageListSchema.shape.items.element;

type ExternalAttachment = z.infer<typeof attachmentSchema>;

function normalizeAttachmentType(input: ExternalAttachment): MessageAttachmentType {
  if (input.sticker) return "sticker";
  const mime = input.mimetype?.toLowerCase() ?? "";
  const type = input.type?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["img", "image", "photo"].includes(type)) return "image";
  if (mime.startsWith("video/") || type === "video") return "video";
  if (mime.startsWith("audio/") || ["audio", "voice"].includes(type)) return "audio";
  if (mime || ["file", "document", "doc"].includes(type)) return "file";
  return "unknown";
}

function normalizeAttachment(input: ExternalAttachment): MessageAttachment | null {
  if (!input.url) return null;
  const dimensions = typeof input.size === "object" && input.size ? input.size : null;
  return {
    external_id: input.id ?? null,
    media_url: publicMediaUrl(input.url),
    type: normalizeAttachmentType(input),
    mime_type: input.mimetype ?? null,
    filename: input.filename ?? input.name ?? null,
    size_bytes: input.file_size ?? dimensions?.bytes ?? (typeof input.size === "number" ? input.size : null),
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    unavailable: input.unavailable ?? false,
    metadata: Object.fromEntries(Object.entries(input).filter(([key]) => ![
      "id", "url", "type", "mimetype", "filename", "name", "file_size", "size", "unavailable",
    ].includes(key))),
  };
}

function publicMediaUrl(url: string): string {
  if (!url.startsWith("att://")) return url;
  const encodedUrl = url.slice("att://".length).split("/")[1];
  if (!encodedUrl) return url;
  try {
    const decoded = Buffer.from(encodedUrl, "base64url").toString("utf8");
    return decoded.startsWith("https://") ? decoded : url;
  } catch {
    return url;
  }
}

function meaningfulText(text: string | null | undefined, attachments: MessageAttachment[]) {
  const value = text ?? "";
  if (
    attachments.length > 0 &&
    /^(?:you|.+) sent (?:a |an )?(?:photo|image|video)\.?$/i.test(value.trim())
  ) return "";
  return value;
}

function normalizeMessage(message: z.infer<typeof storedMessageSchema>): NormalizedInboxMessage {
  const attachments = normalizeAttachments(message.attachments);
  return {
    externalMessageId: message.id,
    text: meaningfulText(message.text, attachments),
    attachments,
    direction: Boolean(message.is_sender) ? "out" : "in",
    occurredAt: message.timestamp,
    quotedMessage: normalizeQuotedMessage(message.quoted),
    delivered: Boolean(message.delivered),
    seen: Boolean(message.seen),
    hidden: Boolean(message.hidden) || isReactionHelperEvent(
      message.text,
      message.is_event,
    ),
    deleted: Boolean(message.deleted),
    edited: Boolean(message.edited),
    reactions: message.reactions.map((reaction) => ({
      value: reaction.value,
      senderId: reaction.sender_id ?? null,
      direction: reaction.is_sender == null
        ? null
        : reaction.is_sender ? "out" : "in",
      occurredAt: reaction.timestamp ?? null,
    })),
    metadata: message,
  };
}

function isReactionHelperEvent(
  text: string | null | undefined,
  isEvent: boolean | number | null | undefined,
): boolean {
  return Boolean(isEvent) && /^reacted\s+.+\s+to your message\.?$/iu.test(
    text?.trim() ?? "",
  );
}

function normalizeQuotedMessage(value: unknown): NormalizedInboxMessage["quotedMessage"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const quoted = value as Record<string, unknown>;
  const rawAttachments = Array.isArray(quoted.attachments)
    ? attachmentSchema.array().safeParse(quoted.attachments)
    : null;
  const isSender = quoted.is_sender;
  return {
    externalMessageId:
      typeof quoted.id === "string"
        ? quoted.id
        : typeof quoted.message_id === "string"
          ? quoted.message_id
          : null,
    text: typeof quoted.text === "string"
      ? quoted.text
      : typeof quoted.message === "string" ? quoted.message : "",
    attachments: rawAttachments?.success
      ? normalizeAttachments(rawAttachments.data)
      : [],
    direction: typeof isSender === "boolean" || typeof isSender === "number"
      ? Boolean(isSender) ? "out" : "in"
      : null,
  };
}

function normalizeAttachments(items: ExternalAttachment[]): MessageAttachment[] {
  return items.map(normalizeAttachment).filter((item): item is MessageAttachment => Boolean(item));
}
function config() {
  const apiUrl = process.env.UNIPILE_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.UNIPILE_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error(
      "UNIPILE_API_URL and UNIPILE_API_KEY must be configured on the server.",
    );
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
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `Unipile request failed (${response.status})`;
    throw new InboxProviderError("unipile", response.status, detail);
  }
  return body;
}

function accountStatus(value: string | undefined): InboxConnectionStatus {
  switch (value?.toUpperCase()) {
    case "OK":
    case "SYNC_SUCCESS":
      return "connected";
    case "CREATION_SUCCESS":
    case "RECONNECTED":
    case "CONNECTING":
      return "syncing";
    case "CREDENTIALS":
    case "PERMISSIONS":
      return "reconnect_required";
    case "DELETED":
      return "disconnected";
    case "CREATION_FAIL":
    case "ERROR":
    case "STOPPED":
      return "error";
    default:
      return "connecting";
  }
}

function sourcesStatus(values: string[]): InboxConnectionStatus {
  const statuses = values.map((value) => value.toUpperCase());
  if (
    statuses.some((value) => value === "CREDENTIALS" || value === "PERMISSIONS")
  )
    return "reconnect_required";
  if (statuses.some((value) => value === "ERROR" || value === "STOPPED"))
    return "error";
  if (statuses.length && statuses.every((value) => value === "OK"))
    return "connected";
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
    const existing = webhookListSchema.parse(
      await request("/webhooks?limit=250"),
    );
    const secret = process.env.UNIPILE_WEBHOOK_SECRET;
    if (!secret)
      throw new Error(
        "UNIPILE_WEBHOOK_SECRET must be configured on the server.",
      );
    const headers = [
      { key: "Content-Type", value: "application/json" },
      { key: "Unipile-Auth", value: secret },
    ];
    const definitions = [
      {
        source: "messaging",
        events: [
          "message_received",
          "message_read",
          "message_delivered",
          "message_edited",
          "message_deleted",
          "message_reaction",
        ],
      },
      {
        source: "account_status",
        events: [
          "creation_success",
          "creation_fail",
          "deleted",
          "reconnected",
          "sync_success",
          "stopped",
          "ok",
          "connecting",
          "error",
          "credentials",
          "permissions",
        ],
      },
    ];
    for (const definition of definitions) {
      const matching = existing.items.filter(
        (item) => item.request_url === requestUrl && item.source === definition.source,
      );
      const requiredEvents = new Set(definition.events);
      if (matching.some((item) =>
        item.events.length === requiredEvents.size &&
        item.events.every((event) => requiredEvents.has(event)))) continue;
      for (const stale of matching) {
        await request(`/webhooks/${encodeURIComponent(stale.id)}`, { method: "DELETE" });
      }
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

  async listChats(
    accountId: string,
    channel: InboxChannel,
  ): Promise<ProviderChat[]> {
    const chats: ProviderChat[] = [];
    let cursor: string | null | undefined;
    const seen = new Set<string>();
    do {
      const accountType = UNIPILE_CHANNELS[channel];
      const query = new URLSearchParams({
        account_id: accountId,
        account_type: accountType,
        limit: "250",
      });
      if (cursor) query.set("cursor", cursor);
      const page = chatListSchema.parse(
        await request(`/chats?${query}`),
      );
      for (const chat of page.items) {
        if (chat.account_type.toUpperCase() !== accountType) continue;
        const participantId =
          chat.attendee_provider_id ?? chat.provider_id ?? chat.id;
        chats.push({
          externalChatId: chat.id,
          participantId,
          name: chat.name?.trim() || `${channelLabel(channel)} contact`,
          unread: chat.unread_count > 0,
          occurredAt: chat.timestamp ? new Date(chat.timestamp) : null,
        });
      }
      cursor = page.cursor;
      if (cursor && seen.has(cursor))
        throw new Error("Unipile chat pagination repeated a cursor.");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return chats;
  }

  async listMessages(externalChatId: string): Promise<NormalizedInboxMessage[]> {
    const messages: NormalizedInboxMessage[] = [];
    let cursor: string | null | undefined;
    const seen = new Set<string>();
    do {
      const query = new URLSearchParams({ limit: "250" });
      if (cursor) query.set("cursor", cursor);
      const page = storedMessageListSchema.parse(
        await request(
          `/chats/${encodeURIComponent(externalChatId)}/messages?${query}`,
        ),
      );
      for (const message of page.items) {
        messages.push(normalizeMessage(message));
      }
      cursor = page.cursor;
      if (cursor && seen.has(cursor))
        throw new Error("Unipile message pagination repeated a cursor.");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return messages;
  }

  async getMessage(externalMessageId: string): Promise<NormalizedInboxMessage> {
    return normalizeMessage(storedMessageSchema.parse(
      await request(`/messages/${encodeURIComponent(externalMessageId)}`),
    ));
  }

  async getAttendeeAvatar(
    accountId: string,
    attendeeId: string,
  ): Promise<string | null> {
    const query = new URLSearchParams({ account_id: accountId });
    const attendee = attendeeSchema.parse(
      await request(
        `/chat_attendees/${encodeURIComponent(attendeeId)}?${query}`,
      ),
    );
    return attendee.picture_url ?? null;
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
    return hostedLinkSchema.parse(
      await request("/hosted/accounts/link", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    ).url;
  }

  async getAccount(accountId: string): Promise<ProviderAccount> {
    const raw = accountSchema.parse(
      await request(`/accounts/${encodeURIComponent(accountId)}`),
    );
    const channel = parseChannel(raw.type);
    if (!channel)
      throw new Error("The connected account uses an unsupported channel.");
    return {
      id: raw.id,
      channel,
      name: raw.name ?? raw.identifier ?? null,
      status: sourcesStatus(raw.sources?.map((source) => source.status) ?? []),
      metadata: raw,
    };
  }

  async getAccountIdentity(accountId: string): Promise<string> {
    const query = new URLSearchParams({ account_id: accountId });
    const profile = userProfileSchema.parse(
      await request(`/users/me?${query}`),
    );
    return profile.provider_id;
  }

  async disconnectAccount(accountId: string): Promise<void> {
    await request(`/accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE",
    });
  }

  async sendMessage(input: {
    accountId: string;
    externalChatId: string;
    text: string;
    attachments: Array<{ content: Blob; filename: string; mimeType: string }>;
  }) {
    const form = new FormData();
    form.set("text", input.text);
    form.set("account_id", input.accountId);
    for (const attachment of input.attachments) {
      form.append("attachments", attachment.content, attachment.filename);
    }
    const result = await request(
        `/chats/${encodeURIComponent(input.externalChatId)}/messages`,
        { method: "POST", body: form },
      );
    const body = sendResponseSchema.safeParse(result);
    return { externalMessageId: body.success ? body.data.message_id ?? null : null };
  }

  async markChatRead(input: {
    accountId: string;
    externalChatId: string;
  }): Promise<void> {
    await request(`/chats/${encodeURIComponent(input.externalChatId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "setReadStatus",
        value: true,
        account_id: input.accountId,
      }),
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
    const account =
      accountStatusSchema.safeParse(payload);
    const accountChannel = account.success
      ? parseChannel(account.data.AccountStatus.account_type)
      : null;
    if (account.success && accountChannel) {
      return {
        type: "account_status",
        providerAccountId: account.data.AccountStatus.account_id,
        channel: accountChannel,
        status: accountStatus(account.data.AccountStatus.message),
      };
    }

    const mutation = messageMutationEventSchema.safeParse(payload);
    if (mutation.success) {
      const channel = parseChannel(mutation.data.account_type);
      if (!channel) return null;
      const mutations = {
        message_read: "read",
        message_delivered: "delivered",
        message_edited: "updated",
        message_deleted: "deleted",
        message_reaction: "reaction",
      } as const;
      return {
        type: "message_mutation",
        mutation: mutations[mutation.data.event],
        channel,
        providerAccountId: mutation.data.account_id,
        externalChatId: mutation.data.chat_id,
        externalMessageId: mutation.data.message_id,
        occurredAt: mutation.data.timestamp,
      };
    }

    const parsed = messageEventSchema.safeParse(payload);
    if (!parsed.success) return null;
    const channel = parseChannel(parsed.data.account_type);
    if (!channel) return null;
    if (parsed.data.event !== "message_received") return null;
    const ownerId = parsed.data.account_info?.user_id;
    const senderId =
      parsed.data.sender.attendee_provider_id ??
      parsed.data.sender.attendee_id ??
      "unknown";
    return {
      type: "message",
      channel,
      providerAccountId: parsed.data.account_id,
      externalChatId: parsed.data.chat_id,
      externalMessageId: parsed.data.message_id,
      occurredAt: parsed.data.timestamp,
      text: meaningfulText(parsed.data.message, normalizeAttachments(parsed.data.attachments)),
      attachments: normalizeAttachments(parsed.data.attachments),
      direction: ownerId && ownerId === senderId ? "out" : "in",
      sender: {
        id: senderId,
        name:
          parsed.data.sender.attendee_name ??
          `${channelLabel(channel)} contact`,
        ...(parsed.data.sender.attendee_id
          ? { attendeeId: parsed.data.sender.attendee_id }
          : {}),
      },
      quotedMessage: null,
    };
  }
}
