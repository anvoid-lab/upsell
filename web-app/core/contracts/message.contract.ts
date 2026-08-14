import { z } from "zod";

const directionSchema = z.enum(["in", "out"]);

const entitySchema = z.object({
  // id e conversation_id são bigint gerados pela BD (migração 004) — coage
  // sempre para string, a forma opaca que o resto da app assume.
  id: z.coerce.string(),
  conversation_id: z.coerce.string(),
  content: z.string().min(1),
  direction: directionSchema,
  timestamp: z.coerce.date(),
  sent_by_ai: z.boolean().nullish(),
  read: z.boolean(),
  // Id da mensagem na plataforma externa — null até T-010. Vai ser essencial
  // para processamento idempotente de webhooks (não inserir a mesma mensagem
  // duas vezes se a Meta reenviar o mesmo evento).
  channel_message_id: z.string().nullish(),
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
