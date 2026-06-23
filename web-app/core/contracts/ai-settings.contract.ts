import { z } from "zod";

const toneSchema = z.enum(["friendly", "professional", "casual"]);
const languageSchema = z.enum(["pt", "en", "fr"]);

const entitySchema = z.object({
  follow_up_delay_hours: z.number().int().positive(),
  use_urgency: z.boolean(),
  use_upsell: z.boolean(),
  use_social_proof: z.boolean(),
  use_cart_recovery: z.boolean(),
  tone: toneSchema,
  language: languageSchema,
});

const responseSchema = z.object({
  settings: entitySchema,
});

export const AISettingsContract = {
  toneSchema,
  languageSchema,
  entitySchema,
  responseSchema,
} as const;

export type AISettings = z.infer<typeof entitySchema>;
export type AISettingsResponse = z.infer<typeof responseSchema>;
