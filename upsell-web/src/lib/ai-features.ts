import type { AISettings } from "@/types/disabled-ai";

/**
 * Visibility gate for preserved AI presentation only.
 * The AI backend has been removed; changing this cannot restore functionality.
 */
export const AI_FEATURES_ENABLED = false;

export const DEFAULT_AI_SETTINGS: AISettings = {
  follow_up_delay_hours: 4,
  use_urgency: true,
  use_upsell: true,
  use_social_proof: true,
  use_cart_recovery: true,
  tone: "friendly",
  language: "pt",
};
