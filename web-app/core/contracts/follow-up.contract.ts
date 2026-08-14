import { z } from "zod";

const statusSchema = z.enum(["scheduled", "sent", "cancelled", "failed"]);
const typeSchema = z.enum(["urgency", "upsell", "social_proof", "cart_recovery"]);

const entitySchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  contact_name: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  status: statusSchema,
  type: typeSchema,
  scheduled_for: z.coerce.date().nullish(),
  sent_at: z.coerce.date().nullish(),
});

const scheduleRequestSchema = z.object({
  conversation_id: z.string(),
  message: z.string().min(1),
  delay_hours: z.number().int().positive(),
  type: typeSchema,
});

export const FollowUpContract = {
  statusSchema,
  typeSchema,
  entitySchema,
  scheduleRequestSchema,
} as const;

export type FollowUpStatus = z.infer<typeof statusSchema>;
export type FollowUpType = z.infer<typeof typeSchema>;
export type FollowUp = z.infer<typeof entitySchema>;
export type ScheduleFollowUpRequest = z.infer<typeof scheduleRequestSchema>;
