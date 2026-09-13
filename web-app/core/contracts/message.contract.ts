import { z } from "zod";

const directionSchema = z.enum(["in", "out"]);
const deliveryStatusSchema = z.enum([
  "pending",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
]);
const attachmentTypeSchema = z.enum([
  "image",
  "video",
  "audio",
  "file",
  "sticker",
  "unknown",
]);
const attachmentSchema = z.object({
  external_id: z.string().nullish(),
  media_url: z.string().nullish(),
  type: attachmentTypeSchema,
  mime_type: z.string().nullish(),
  filename: z.string().nullish(),
  size_bytes: z.number().nonnegative().nullish(),
  width: z.number().nonnegative().nullish(),
  height: z.number().nonnegative().nullish(),
  unavailable: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const quotedMessageSchema = z.object({
  external_message_id: z.string().nullish(),
  text: z.string().default(""),
  attachments: z.array(attachmentSchema).default([]),
  direction: directionSchema.nullish(),
});

const reactionSchema = z.object({
  value: z.string().min(1),
  sender_id: z.string().nullish(),
  direction: directionSchema.nullish(),
  occurred_at: z.coerce.date().nullish(),
});

const entitySchema = z.object({
  // The database generates id and conversation_id as bigint values. Always
  // coerce them to strings, which the rest of the app treats as opaque IDs.
  id: z.coerce.string(),
  conversation_id: z.coerce.string(),
  content: z.string(),
  attachment: z.array(attachmentSchema).default([]),
  direction: directionSchema,
  timestamp: z.coerce.date(),
  read: z.boolean(),
  // Message ID from the external platform, used for idempotent webhook handling.
  channel_message_id: z.string().nullish(),
  channel_id: z.string().uuid().nullish(),
  client_message_id: z.string().uuid().nullish(),
  delivery_status: deliveryStatusSchema.nullish(),
  delivery_error: z.string().nullish(),
  delivery_updated_at: z.coerce.date().nullish(),
  reply_to_message_id: z.coerce.string().nullish(),
  quoted_message: quotedMessageSchema.nullish(),
  delivered_at: z.coerce.date().nullish(),
  read_at: z.coerce.date().nullish(),
  edited_at: z.coerce.date().nullish(),
  provider_deleted_at: z.coerce.date().nullish(),
  hidden: z.boolean().default(false),
  reactions: z.array(reactionSchema).default([]),
  provider_metadata: z.record(z.string(), z.unknown()).default({}),
});

const sendRequestSchema = z.object({
  conversation_id: z.string(),
  content: z.string(),
  client_message_id: z.string().uuid(),
  attachment_count: z.number().int().nonnegative().default(0),
}).refine((value) => value.content.trim().length > 0 || value.attachment_count > 0, {
  message: "A message must contain text or an attachment.",
});

const retryRequestSchema = z.object({ message_id: z.string() });

const sendResponseSchema = z.object({
  message: entitySchema,
});

export const MessageContract = {
  directionSchema,
  deliveryStatusSchema,
  attachmentTypeSchema,
  attachmentSchema,
  quotedMessageSchema,
  reactionSchema,
  entitySchema,
  sendRequestSchema,
  retryRequestSchema,
  sendResponseSchema,
} as const;

export type MessageDirection = z.infer<typeof directionSchema>;
export type MessageDeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type MessageAttachmentType = z.infer<typeof attachmentTypeSchema>;
export type MessageAttachment = z.infer<typeof attachmentSchema>;
export type QuotedMessage = z.infer<typeof quotedMessageSchema>;
export type MessageReaction = z.infer<typeof reactionSchema>;
export type Message = z.infer<typeof entitySchema>;
export type SendMessageRequest = z.infer<typeof sendRequestSchema>;
export type SendMessageResponse = z.infer<typeof sendResponseSchema>;
