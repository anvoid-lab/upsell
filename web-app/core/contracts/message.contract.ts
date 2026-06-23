import { z } from "zod";

const directionSchema = z.enum(["in", "out"]);

const entitySchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  content: z.string().min(1),
  direction: directionSchema,
  timestamp: z.string(),
  sent_by_ai: z.boolean().nullish(),
  read: z.boolean(),
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
