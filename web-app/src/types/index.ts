export type NavSection = "inbox" | "mine" | "unassigned" | "followups" | "resolved" | "analytics" | "settings";

export type {
  AnalyticsKPI,
  ChannelConnection,
  ChannelType,
  Contact,
  ContactStatus,
  Conversation,
  ConversationDataPoint,
  ConversationDoc,
  ConversationRealtimeRow,
  ConversationStatus,
  FollowUp,
  FollowUpStatus,
  FollowUpType,
  Message,
  MessageDirection,
  Platform,
  PlatformStat,
  ProductInterest,
  User,
  UserRole,
} from "@core/contracts";

export type { AISuggestion, AISettings } from "./disabled-ai";
