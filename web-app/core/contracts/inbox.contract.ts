import { z } from "zod";

export type InboxChannel = "whatsapp" | "instagram";
export type InboxProviderName = "unipile";
export type InboxConnectionStatus =
  | "disconnected"
  | "connecting"
  | "syncing"
  | "connected"
  | "reconnect_required"
  | "error";

export type HostedAuthRequest = {
  channel: InboxChannel;
  state: string;
  notifyUrl: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
  reconnectAccountId?: string;
};

export type ProviderAccount = {
  id: string;
  channel: InboxChannel;
  name: string | null;
  status: InboxConnectionStatus;
  metadata: Record<string, unknown>;
};

export type ProviderMessageEvent = {
  type: "message";
  channel: InboxChannel;
  providerAccountId: string;
  externalChatId: string;
  externalMessageId: string;
  occurredAt: Date;
  text: string;
  direction: "in" | "out";
  sender: { id: string; name: string };
};

export type ProviderAccountEvent = {
  type: "account_status";
  providerAccountId: string;
  channel: InboxChannel;
  status: InboxConnectionStatus;
};

export type ProviderEvent = ProviderMessageEvent | ProviderAccountEvent;

export type ProviderChat = {
  externalChatId: string;
  participantId: string;
  name: string;
  unread: boolean;
  occurredAt: Date | null;
};

export type ProviderStoredMessage = {
  externalMessageId: string;
  text: string;
  direction: "in" | "out";
  occurredAt: Date;
};

export interface InboxProvider {
  readonly name: InboxProviderName;
  ensureWebhooks(requestUrl: string): Promise<void>;
  listChats(accountId: string, channel: InboxChannel): Promise<ProviderChat[]>;
  listMessages(externalChatId: string): Promise<ProviderStoredMessage[]>;
  createHostedAuthLink(request: HostedAuthRequest): Promise<string>;
  getAccount(accountId: string): Promise<ProviderAccount>;
  disconnectAccount(accountId: string): Promise<void>;
  sendMessage(input: {
    accountId: string;
    externalChatId: string;
    text: string;
  }): Promise<{ externalMessageId: string }>;
  markChatRead(input: { accountId: string; externalChatId: string }): Promise<void>;
  verifyWebhook(headers: Headers): boolean;
  parseWebhook(payload: unknown): ProviderEvent | null;
}

export class InboxProviderError extends Error {
  constructor(
    public readonly provider: InboxProviderName,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "InboxProviderError";
  }
}

const channelSchema = z.enum(["whatsapp", "instagram"]);

const hostedAuthStateSchema = z.object({
  businessId: z.string().uuid(),
  channelId: z.string().uuid(),
  provider: z.literal("unipile"),
  channel: channelSchema,
});

const hostedAuthCallbackSchema = z.object({
  status: z.enum(["CREATION_SUCCESS", "RECONNECTED"]),
  account_id: z.string().min(1),
  name: z.string().min(1),
});

const unipileHostedLinkSchema = z.object({ url: z.string().url() });
const unipileSendResponseSchema = z.object({ message_id: z.string().min(1) }).passthrough();
const unipileAccountSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  name: z.string().nullish(),
  identifier: z.string().nullish(),
  connection_params: z.record(z.string(), z.unknown()).optional(),
  sources: z.array(z.object({ status: z.string() }).passthrough()).optional(),
}).passthrough();
const unipileMessageEventSchema = z.object({
  event: z.string(),
  account_id: z.string().min(1),
  account_type: z.string(),
  account_info: z.object({ user_id: z.string().optional() }).passthrough().optional(),
  chat_id: z.string().min(1),
  message_id: z.string().min(1),
  timestamp: z.coerce.date(),
  message: z.string().default(""),
  sender: z.object({
    attendee_id: z.string().optional(),
    attendee_provider_id: z.string().optional(),
    attendee_name: z.string().optional(),
  }).passthrough(),
}).passthrough();
const unipileAccountStatusSchema = z.object({
  AccountStatus: z.object({
    account_id: z.string().min(1),
    account_type: z.string(),
    message: z.string(),
  }),
});
const unipileWebhookListSchema = z.object({
  items: z.array(z.object({ request_url: z.string(), source: z.string() }).passthrough()),
}).passthrough();
const unipileChatListSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    account_type: z.string(),
    attendee_provider_id: z.string().optional(),
    provider_id: z.string().optional(),
    name: z.string().nullish(),
    timestamp: z.string().nullish(),
    unread_count: z.number().default(0),
  }).passthrough()),
  cursor: z.string().nullish(),
}).passthrough();
const unipileStoredMessageListSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    text: z.string().nullish(),
    timestamp: z.coerce.date(),
    is_sender: z.union([z.boolean(), z.number()]),
    attachments: z.array(z.unknown()).default([]),
  }).passthrough()),
  cursor: z.string().nullish(),
}).passthrough();

export const InboxContract = {
  channelSchema,
  connectionStatusSchema: z.enum(["disconnected", "connecting", "syncing", "connected", "reconnect_required", "error"]),
  hostedAuthStateSchema,
  hostedAuthCallbackSchema,
  unipile: {
    hostedLinkSchema: unipileHostedLinkSchema,
    sendResponseSchema: unipileSendResponseSchema,
    accountSchema: unipileAccountSchema,
    messageEventSchema: unipileMessageEventSchema,
    accountStatusSchema: unipileAccountStatusSchema,
    webhookListSchema: unipileWebhookListSchema,
    chatListSchema: unipileChatListSchema,
    storedMessageListSchema: unipileStoredMessageListSchema,
  },
} as const;
