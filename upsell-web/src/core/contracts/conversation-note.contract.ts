import { z } from "zod";

const entitySchema = z.object({
  id: z.coerce.string(),
  conversation_id: z.coerce.string(),
  author_id: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
  created_at: z.coerce.date(),
});

const createRequestSchema = z.object({
  conversation_id: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
});

export const ConversationNoteContract = {
  entitySchema,
  createRequestSchema,
} as const;

export type ConversationNote = z.infer<typeof entitySchema>;
export type CreateConversationNoteRequest = z.infer<typeof createRequestSchema>;
