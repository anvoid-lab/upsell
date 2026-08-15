import { z } from "zod";
import { FollowUpContract } from "./follow-up.contract";

// Resposta esperada do método "reply_suggestion" da inferência. `technique`
// reutiliza o mesmo enum que `follow_ups.type`/`ai_suggestions.type` já usam —
// é a mesma ideia (qual técnica de venda a mensagem aplica), não um conceito novo.
const candidateSchema = z.object({
  message: z.string().min(1),
  technique: FollowUpContract.typeSchema,
  rationale: z.string().min(1),
});

const responseSchema = z.object({
  candidates: z.array(candidateSchema).min(1),
});

export const ReplySuggestionContract = {
  candidateSchema,
  responseSchema,
} as const;

export type ReplyCandidate = z.infer<typeof candidateSchema>;
export type ReplySuggestionResponse = z.infer<typeof responseSchema>;
