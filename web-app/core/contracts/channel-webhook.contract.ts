import { z } from "zod";
import { ChannelContract } from "./channel.contract";

/**
 * Mensagem recebida de um canal (WhatsApp/Instagram/Facebook).
 *
 * Formato deliberadamente neutro em vez do envelope real da Meta
 * (`entry[].changes[].value.messages[]`): a integração real é a T-010 e ainda
 * não existe, por isso modelar agora o aninhamento deles seria especular. A
 * T-010 acrescenta um adaptador Meta→interno à frente disto, e o resto do
 * webhook não muda.
 */
const inboundMessageSchema = z.object({
  channel: ChannelContract.typeSchema,
  /** Id da conversa na plataforma externa — a chave para reencontrar o lead. */
  channel_conversation_id: z.string().min(1),
  /**
   * Id da mensagem na plataforma externa. É a chave de idempotência: a Meta
   * reenvia entregas, e a segunda tem de ser um no-op em vez de uma segunda
   * bolha na conversa.
   */
  channel_message_id: z.string().min(1),
  contact: z.object({
    name: z.string().min(1),
    /** Número de telefone ou handle, consoante a plataforma. */
    handle: z.string().min(1),
  }),
  text: z.string().min(1),
  /** Quando o cliente enviou — não quando nós recebemos. */
  timestamp: z.coerce.date(),
});

/**
 * O que se devolve ao provider. Não inclui `business_id` de propósito: é um
 * identificador interno de tenant e não tem nada que fazer numa resposta a
 * quem está do lado de fora.
 */
const resultSchema = z.object({
  status: z.enum(["accepted", "duplicate"]),
  conversation_id: z.string(),
});

export const ChannelWebhookContract = {
  inboundMessageSchema,
  resultSchema,
} as const;

export type InboundChannelMessage = z.infer<typeof inboundMessageSchema>;
export type ChannelWebhookResult = z.infer<typeof resultSchema>;
