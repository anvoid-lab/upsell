import { z } from "zod";

const typeSchema = z.enum(["whatsapp", "instagram", "facebook"]);

const connectionSchema = z.object({
  platform: typeSchema,
  connected: z.boolean(),
  account_name: z.string().nullish(),
  connected_at: z.coerce.date().nullish(),
  provider: z.string().optional(),
  connection_status: z.enum([
    "disconnected", "connecting", "syncing", "connected", "reconnect_required", "error",
  ]).optional(),
});

const connectRequestSchema = z.object({
  platform: typeSchema,
});

const connectionResponseSchema = z.object({
  channel: connectionSchema,
});

export const ChannelContract = {
  typeSchema,
  connectionSchema,
  connectRequestSchema,
  connectionResponseSchema,
} as const;

export type ChannelType = z.infer<typeof typeSchema>;
export type Platform = ChannelType;
export type ChannelConnection = z.infer<typeof connectionSchema>;
export type ConnectChannelRequest = z.infer<typeof connectRequestSchema>;
export type ChannelConnectionResponse = z.infer<typeof connectionResponseSchema>;
