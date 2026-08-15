import { z } from "zod";
import { FollowUpContract } from "./follow-up.contract";

const entitySchema = z.object({
  // conversation_id is bigint in the database (migration 004) — always coerced
  // to string.
  conversation_id: z.coerce.string(),
  message: z.string().min(1),
  type: FollowUpContract.typeSchema,
  // Added by migration 006 — nullish because legacy rows don't have it.
  rationale: z.string().nullish(),
  // The inbound message this suggestion was generated for — what decides
  // whether it still applies when the conversation is reopened. bigint in the
  // database, coerced to string like every other id. Nullish: rows generated
  // before this column existed, and conversations with no customer message yet.
  source_message_id: z.coerce.string().nullish(),
  created_at: z.coerce.date(),
});

// What gets validated before insert — without created_at, which the database
// generates.
const writeSchema = entitySchema.omit({ created_at: true });

const responseSchema = z.object({
  suggestion: entitySchema.nullable(),
});

export const AISuggestionContract = {
  entitySchema,
  writeSchema,
  responseSchema,
} as const;

export type AISuggestion = z.infer<typeof entitySchema>;
export type AISuggestionResponse = z.infer<typeof responseSchema>;
