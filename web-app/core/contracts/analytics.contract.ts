import { z } from "zod";
import { ChannelContract } from "./channel.contract";

const kpiSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  delta: z.string().min(1),
  delta_positive: z.boolean(),
  icon: z.string().min(1),
});

const conversationDataPointSchema = z.object({
  date: z.string().min(1),
  total: z.number().int().nonnegative(),
  followed_up: z.number().int().nonnegative(),
  converted: z.number().int().nonnegative(),
});

const platformStatSchema = z.object({
  platform: ChannelContract.typeSchema,
  conversations: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  rate: z.number().nonnegative(),
});

const overviewResponseSchema = z.object({
  kpis: z.array(kpiSchema),
  chart_data: z.array(conversationDataPointSchema),
  platform_stats: z.array(platformStatSchema),
});

export const AnalyticsContract = {
  kpiSchema,
  conversationDataPointSchema,
  platformStatSchema,
  overviewResponseSchema,
} as const;

export type AnalyticsKPI = z.infer<typeof kpiSchema>;
export type ConversationDataPoint = z.infer<typeof conversationDataPointSchema>;
export type PlatformStat = z.infer<typeof platformStatSchema>;
export type AnalyticsOverviewResponse = z.infer<typeof overviewResponseSchema>;
