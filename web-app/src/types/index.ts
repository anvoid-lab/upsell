// ─── Conversation / Contact ───────────────────────────────────────────────

export type Platform = "whatsapp" | "instagram" | "facebook";
export type ConversationStatus = "open" | "pending" | "resolved";
export type MessageDirection = "in" | "out";
export type FollowUpStatus = "scheduled" | "sent" | "cancelled" | "failed";
export type FollowUpType = "urgency" | "upsell" | "social_proof" | "cart_recovery";
export type ContactStatus = "interested" | "converted" | "lost" | "new";
export type NavSection = "inbox" | "mine" | "unassigned" | "followups" | "resolved" | "analytics" | "settings";

export interface Contact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  platform: Platform;
  phone?: string;
  firstContact: string;
  status: ContactStatus;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  direction: MessageDirection;
  timestamp: string;
  sentByAI?: boolean;
  read: boolean;
}

export interface ProductInterest {
  item: string;
  price: string;
  stock: number | null;
  isLowStock: boolean;
}

export interface FollowUp {
  id: string;
  conversationId: string;
  contactName: string;
  title: string;
  message: string;
  status: FollowUpStatus;
  type: FollowUpType;
  scheduledFor?: string;
  sentAt?: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  lastMessage: string;
  lastMessageAt: string;
  status: ConversationStatus;
  unread: boolean;
  aiScheduled: boolean;
  messages: Message[];
  productInterest?: ProductInterest;
  followUps: FollowUp[];
}

export interface AISuggestion {
  conversationId: string;
  message: string;
  type: FollowUpType;
}

// ─── Analytics ───────────────────────────────────────────────────────────

export interface AnalyticsKPI {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  icon: string;
}

export interface ConversationDataPoint {
  date: string;
  total: number;
  followedUp: number;
  converted: number;
}

export interface PlatformStat {
  platform: Platform;
  conversations: number;
  conversions: number;
  rate: number;
}

// ─── Settings ────────────────────────────────────────────────────────────

export interface ChannelConnection {
  platform: Platform;
  connected: boolean;
  accountName?: string;
  connectedAt?: string;
}

export interface AISettings {
  followUpDelayHours: number;
  useUrgency: boolean;
  useUpsell: boolean;
  useSocialProof: boolean;
  useCartRecovery: boolean;
  tone: "friendly" | "professional" | "casual";
  language: "pt" | "en" | "fr";
}
