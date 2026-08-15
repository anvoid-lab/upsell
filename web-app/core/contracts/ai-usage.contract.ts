import { z } from "zod";

const statusSchema = z.enum(["success", "error"]);

// Contagem de tokens devolvida pela inferência (`ml/`) — é o lado que fala
// com o LLM e conhece os números reais. Tudo nullish: uma chamada que falhou
// antes de chegar ao modelo não tem contagens nenhumas.
const tokensSchema = z.object({
  model: z.string().nullish(),
  prompt_tokens: z.number().int().nonnegative().nullish(),
  completion_tokens: z.number().int().nonnegative().nullish(),
  total_tokens: z.number().int().nonnegative().nullish(),
});

// Envelope de `POST /generate`. `data` fica deliberadamente por validar aqui —
// a sua forma muda com o método pedido, por isso cada chamador de `generate()`
// passa o seu próprio schema.
const envelopeSchema = z.object({
  data: z.unknown(),
  usage: tokensSchema.nullish(),
});

const entitySchema = z.object({
  // id e conversation_id são bigint gerados pela BD (migração 004) — coage
  // sempre para string, a forma opaca que o resto da app assume.
  id: z.coerce.string(),
  business_id: z.string(),
  conversation_id: z.coerce.string().nullish(),
  method: z.string().min(1),
  model: z.string().nullish(),
  prompt_tokens: z.number().int().nonnegative().nullish(),
  completion_tokens: z.number().int().nonnegative().nullish(),
  total_tokens: z.number().int().nonnegative().nullish(),
  latency_ms: z.number().int().nonnegative(),
  status: statusSchema,
  error_message: z.string().nullish(),
  created_at: z.coerce.date(),
});

// O que `generate()` entrega ao `usageSink` — sem id nem created_at, que a
// base de dados gera.
const recordSchema = entitySchema.omit({ id: true, created_at: true });

export const AIUsageContract = {
  statusSchema,
  tokensSchema,
  envelopeSchema,
  entitySchema,
  recordSchema,
} as const;

export type AIUsageStatus = z.infer<typeof statusSchema>;
export type AITokens = z.infer<typeof tokensSchema>;
export type AIEnvelope = z.infer<typeof envelopeSchema>;
export type AIUsage = z.infer<typeof entitySchema>;
export type AIUsageRecord = z.infer<typeof recordSchema>;
