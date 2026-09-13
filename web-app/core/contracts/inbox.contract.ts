import { z } from "zod";
import type { MessageAttachment } from "./message.contract";

export type InboxChannel = "whatsapp" | "instagram";
export type InboxProviderName = "unipile";
export const DEFAULT_INBOX_CHANNEL: InboxChannel = "instagram";
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
  attachments: MessageAttachment[];
  direction: "in" | "out";
  sender: { id: string; name: string; attendeeId?: string };
  quotedMessage: NormalizedQuotedMessage | null;
  delivered?: boolean;
  seen?: boolean;
  hidden?: boolean;
  deleted?: boolean;
  edited?: boolean;
  reactions?: NormalizedMessageReaction[];
  metadata?: Record<string, unknown>;
};

export type ProviderMessageMutationEvent = {
  type: "message_mutation";
  mutation: "delivered" | "read" | "updated" | "deleted" | "reaction";
  channel: InboxChannel;
  providerAccountId: string;
  externalChatId: string;
  externalMessageId: string;
  occurredAt: Date;
};

export type ProviderAccountEvent = {
  type: "account_status";
  providerAccountId: string;
  channel: InboxChannel;
  status: InboxConnectionStatus;
};

export type ProviderEvent =
  | ProviderMessageEvent
  | ProviderMessageMutationEvent
  | ProviderAccountEvent;

export type ProviderChat = {
  externalChatId: string;
  participantId: string;
  name: string;
  unread: boolean;
  occurredAt: Date | null;
};

export type NormalizedInboxMessage = {
  externalMessageId: string;
  text: string;
  attachments: MessageAttachment[];
  direction: "in" | "out";
  occurredAt: Date;
  quotedMessage: NormalizedQuotedMessage | null;
  delivered: boolean;
  seen: boolean;
  hidden: boolean;
  deleted: boolean;
  edited: boolean;
  reactions: NormalizedMessageReaction[];
  metadata: Record<string, unknown>;
};

export type NormalizedQuotedMessage = {
  externalMessageId: string | null;
  text: string;
  attachments: MessageAttachment[];
  direction: "in" | "out" | null;
};

export type NormalizedMessageReaction = {
  value: string;
  senderId: string | null;
  direction: "in" | "out" | null;
  occurredAt: Date | null;
};

export interface InboxProvider {
  readonly name: InboxProviderName;
  ensureWebhooks(requestUrl: string): Promise<void>;
  listChats(accountId: string, channel: InboxChannel): Promise<ProviderChat[]>;
  listMessages(externalChatId: string): Promise<NormalizedInboxMessage[]>;
  getMessage(externalMessageId: string): Promise<NormalizedInboxMessage>;
  getAttendeeAvatar(accountId: string, attendeeId: string): Promise<string | null>;
  createHostedAuthLink(request: HostedAuthRequest): Promise<string>;
  getAccount(accountId: string): Promise<ProviderAccount>;
  getAccountIdentity(accountId: string): Promise<string>;
  disconnectAccount(accountId: string): Promise<void>;
  sendMessage(input: {
    accountId: string;
    externalChatId: string;
    text: string;
    attachments: Array<{ content: Blob; filename: string; mimeType: string }>;
  }): Promise<{ externalMessageId: string | null }>;
  markChatRead(input: {
    accountId: string;
    externalChatId: string;
  }): Promise<void>;
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

export const InboxContract = {
  channelSchema,
  connectionStatusSchema: z.enum([
    "disconnected",
    "connecting",
    "syncing",
    "connected",
    "reconnect_required",
    "error",
  ]),
  hostedAuthStateSchema,
  hostedAuthCallbackSchema,
} as const;
