import { z } from "zod";
import { ChannelContract } from "./channel.contract";

const statusSchema = z.enum(["interested", "converted", "lost", "new"]);

const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  initials: z.string().min(1),
  avatar_bg: z.string().min(1),
  avatar_color: z.string().min(1),
  platform: ChannelContract.typeSchema,
  phone: z.string().nullish(),
  first_contact: z.string(),
  status: statusSchema,
});

export const ContactContract = {
  statusSchema,
  entitySchema,
} as const;

export type ContactStatus = z.infer<typeof statusSchema>;
export type Contact = z.infer<typeof entitySchema>;
