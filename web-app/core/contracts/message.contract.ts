import { z } from "zod";

const directionSchema = z.enum(["in", "out"]);

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
});

const sendRequestSchema = z.object({
  conversation_id: z.string(),
  content: z.string().min(1),
});

const sendResponseSchema = z.object({
  message: entitySchema,
});

export const MessageContract = {
  directionSchema,
  entitySchema,
  sendRequestSchema,
  sendResponseSchema,
} as const;

export type MessageDirection = z.infer<typeof directionSchema>;
export type Message = z.infer<typeof entitySchema>;
export type SendMessageRequest = z.infer<typeof sendRequestSchema>;
export type SendMessageResponse = z.infer<typeof sendResponseSchema>;
