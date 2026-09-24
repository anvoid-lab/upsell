import type { ConversationStatus, FollowUpStatus } from "@/types";

type ColorPair = { bg: string; text: string; border?: string };

export const STATUS_COLORS: Record<ConversationStatus, ColorPair> = {
  open:     { bg: "bg-primary-50",  text: "text-primary-600",  border: "border-primary-200" },
  pending:  { bg: "bg-neutral-50",  text: "text-neutral-600",  border: "border-neutral-200" },
  resolved: { bg: "bg-neutral-50",  text: "text-neutral-600",  border: "border-neutral-200" },
} as const;

export const STATUS_DOT: Record<ConversationStatus, string> = {
  open: "bg-primary-500",
  pending: "bg-neutral-400",
  resolved: "bg-neutral-400",
} as const;

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
} as const;

export const FOLLOW_UP_STATUS_COLORS: Record<FollowUpStatus, ColorPair> = {
  scheduled: { bg: "bg-primary-50", text: "text-primary-600", border: "border-primary-200" },
  sent: { bg: "bg-neutral-100", text: "text-neutral-500", border: "border-neutral-200" },
  failed: { bg: "bg-neutral-100", text: "text-neutral-500", border: "border-neutral-200" },
  cancelled: { bg: "bg-neutral-100", text: "text-neutral-500", border: "border-neutral-200" },
} as const;

export const CONTACT_STATUS_COLORS: Record<string, ColorPair> = {
  interested: { bg: "bg-primary-50", text: "text-primary-600", border: "border-primary-200" },
  converted: { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
  lost: { bg: "bg-neutral-100", text: "text-neutral-500", border: "border-neutral-200" },
  new: { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
} as const;

export const AI_SUGGESTION_COLORS = {
  badge: "bg-primary-50 text-primary-600 border-primary-200",
  dot: "bg-primary-500",
  card: "border-primary-200",
  label: "text-primary-600",
  icon: "text-primary-500",
  bg: "bg-primary-50/30",
} as const;

export const UNREAD_DOT = "bg-primary-500";
