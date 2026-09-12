import { z } from "zod";

const directionSchema = z.enum(["in", "out"]);
const deliveryStatusSchema = z.enum(["pending", "sending", "sent", "failed"]);

const entitySchema = z.object({
  // The database generates id and conversation_id as bigint values. Always
  // coerce them to strings, which the rest of the app treats as opaque IDs.
  id: z.coerce.string(),
  conversation_id: z.coerce.string(),
  content: z.string().min(1),
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
});

const sendRequestSchema = z.object({
  conversation_id: z.string(),
  content: z.string().min(1),
  client_message_id: z.string().uuid(),
});

const retryRequestSchema = z.object({ message_id: z.string() });

const sendResponseSchema = z.object({
  message: entitySchema,
});

export const MessageContract = {
  directionSchema,
  deliveryStatusSchema,
  entitySchema,
  sendRequestSchema,
  retryRequestSchema,
  sendResponseSchema,
} as const;

export type MessageDirection = z.infer<typeof directionSchema>;
export type MessageDeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type Message = z.infer<typeof entitySchema>;
export type SendMessageRequest = z.infer<typeof sendRequestSchema>;
export type SendMessageResponse = z.infer<typeof sendResponseSchema>;
