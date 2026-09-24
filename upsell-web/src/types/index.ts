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
  ConversationNote,
  ConversationRealtimeRow,
  ConversationStatus,
  FollowUp,
  FollowUpStatus,
  FollowUpType,
  Message,
  MessageAttachmentType,
  MessageDeliveryStatus,
  MessageDirection,
  InboxConnectionStatus,
  Platform,
  PlatformStat,
  ProductInterest,
  User,
  UserRole,
} from "../core/contracts";

export type { AISuggestion, AISettings } from "./disabled-ai";
