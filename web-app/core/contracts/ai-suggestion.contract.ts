import { z } from "zod";
import { FollowUpContract } from "./follow-up.contract";

const entitySchema = z.object({
  conversation_id: z.string(),
  message: z.string().min(1),
  type: FollowUpContract.typeSchema,
});

const responseSchema = z.object({
  suggestion: entitySchema.nullable(),
});

export const AISuggestionContract = {
  entitySchema,
  responseSchema,
} as const;

export type AISuggestion = z.infer<typeof entitySchema>;
export type AISuggestionResponse = z.infer<typeof responseSchema>;
