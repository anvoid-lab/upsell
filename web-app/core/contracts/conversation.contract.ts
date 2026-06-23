import { z } from "zod";
import { ChannelContract } from "./channel.contract";
import { ContactContract } from "./contact.contract";
import { FollowUpContract } from "./follow-up.contract";
import { MessageContract } from "./message.contract";
import { ProductInterestContract } from "./product-interest.contract";

const statusSchema = z.enum(["open", "pending", "resolved"]);

// Shape stored in MongoDB — no messages (normalised to messages collection)
const docSchema = z.object({
  id: z.string(),
  contact: ContactContract.entitySchema,
  last_message: z.string(),
  last_message_at: z.string(),
  status: statusSchema,
  unread: z.boolean(),
  ai_scheduled: z.boolean(),
  product_interest: ProductInterestContract.entitySchema.optional(),
  follow_ups: z.array(FollowUpContract.entitySchema),
});

// Domain/UI shape — messages joined by service
const entitySchema = docSchema.extend({
  messages: z.array(MessageContract.entitySchema).default([]),
});

const listRequestSchema = z.object({
  status: statusSchema.optional(),
  platform: ChannelContract.typeSchema.optional(),
  search: z.string().optional(),
});

const listResponseSchema = z.object({
  conversations: z.array(entitySchema),
});

const detailResponseSchema = z.object({
  conversation: entitySchema.nullable(),
});

export const ConversationContract = {
  statusSchema,
  docSchema,
  entitySchema,
  listRequestSchema,
  listResponseSchema,
  detailResponseSchema,
} as const;

export type ConversationStatus = z.infer<typeof statusSchema>;
export type ConversationDoc = z.infer<typeof docSchema>;
export type Conversation = z.infer<typeof entitySchema>;
export type ListConversationsRequest = z.infer<typeof listRequestSchema>;
export type ListConversationsResponse = z.infer<typeof listResponseSchema>;
export type ConversationDetailResponse = z.infer<typeof detailResponseSchema>;
