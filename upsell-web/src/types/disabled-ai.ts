/** Presentation models for the archived, hidden AI controls. No backend exists. */
export interface AISuggestion {
  message: string;
  type: "urgency" | "upsell" | "social_proof" | "cart_recovery";
  rationale?: string | null;
}
export interface AISettings {
  follow_up_delay_hours: number;
  use_urgency: boolean;
  use_upsell: boolean;
  use_social_proof: boolean;
  use_cart_recovery: boolean;
  tone: "friendly" | "professional" | "casual";
  language: "pt" | "en" | "fr";
}
