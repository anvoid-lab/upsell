import type {
  Conversation,
  AISuggestion,
  AnalyticsKPI,
  ConversationDataPoint,
  PlatformStat,
  ChannelConnection,
  AISettings,
} from "@/types";

// ─── Conversations ────────────────────────────────────────────────────────────

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    contact: { id: "u1", name: "Miguel João", initials: "MJ", avatar_bg: "#EDE9FE", avatar_color: "#4338CA", platform: "whatsapp", phone: "+244 923 456 789", first_contact: "Today", status: "interested" },
    last_message: "How much are the Nike Air trainers?",
    last_message_at: "2m",
    status: "open",
    unread: true,
    ai_scheduled: false,
    messages: [
      { id: "m1", conversation_id: "c1", content: "How much are the Nike Air trainers?", direction: "in", timestamp: "10:42", read: true },
      { id: "m2", conversation_id: "c1", content: "They're $45, available in sizes 40 to 44.", direction: "out", timestamp: "10:44", read: true },
      { id: "m3", conversation_id: "c1", content: "Ok, I'll think about it.", direction: "in", timestamp: "10:45", read: true },
    ],
    product_interest: { item: "Nike Air", price: "$45", stock: 2, is_low_stock: true },
    follow_ups: [
      { id: "f1", conversation_id: "c1", contact_name: "Miguel João", title: "Urgency message", message: "Only 2 pairs left in your size...", status: "scheduled", type: "urgency", scheduled_for: "Sends in 6 hours" },
    ],
  },
  {
    id: "c2",
    contact: { id: "u2", name: "Ana Silva", initials: "AS", avatar_bg: "#FCE7F3", avatar_color: "#9D174D", platform: "instagram", first_contact: "Yesterday", status: "interested" },
    last_message: "I'll think about it and get back to you",
    last_message_at: "1h",
    status: "open",
    unread: false,
    ai_scheduled: true,
    messages: [
      { id: "m4", conversation_id: "c2", content: "Do you have the summer dress in size S?", direction: "in", timestamp: "09:10", read: true },
      { id: "m5", conversation_id: "c2", content: "Yes! We have it in S, M and L. Price is $38.", direction: "out", timestamp: "09:15", read: true },
      { id: "m6", conversation_id: "c2", content: "I'll think about it and get back to you", direction: "in", timestamp: "09:16", read: true },
    ],
    product_interest: { item: "Summer Dress", price: "$38", stock: 5, is_low_stock: false },
    follow_ups: [
      { id: "f2", conversation_id: "c2", contact_name: "Ana Silva", title: "Social proof", message: "Other customers loved this dress...", status: "scheduled", type: "social_proof", scheduled_for: "Sends in 3 hours" },
    ],
  },
  {
    id: "c3",
    contact: { id: "u3", name: "Kwame M.", initials: "KM", avatar_bg: "#DCFCE7", avatar_color: "#166534", platform: "facebook", first_contact: "Today", status: "new" },
    last_message: "Do you ship to Luanda?",
    last_message_at: "3h",
    status: "open",
    unread: true,
    ai_scheduled: false,
    messages: [
      { id: "m7", conversation_id: "c3", content: "Do you ship to Luanda?", direction: "in", timestamp: "08:00", read: true },
    ],
    follow_ups: [],
  },
  {
    id: "c4",
    contact: { id: "u4", name: "Pedro C.", initials: "PC", avatar_bg: "#FEF3C7", avatar_color: "#92400E", platform: "whatsapp", first_contact: "Yesterday", status: "interested" },
    last_message: "Thanks, I'll buy it tomorrow!",
    last_message_at: "Yesterday",
    status: "pending",
    unread: false,
    ai_scheduled: false,
    messages: [
      { id: "m8",  conversation_id: "c4", content: "Is the leather jacket still available?", direction: "in",  timestamp: "Yesterday 14:00", read: true },
      { id: "m9",  conversation_id: "c4", content: "Yes it is! Only 1 left in stock.",        direction: "out", timestamp: "Yesterday 14:05", read: true },
      { id: "m10", conversation_id: "c4", content: "Thanks, I'll buy it tomorrow!",           direction: "in",  timestamp: "Yesterday 14:10", read: true },
    ],
    product_interest: { item: "Leather Jacket", price: "$89", stock: 1, is_low_stock: true },
    follow_ups: [
      { id: "f3", conversation_id: "c4", contact_name: "Pedro C.", title: "Cart recovery", message: "Hey Pedro, are you still interested?", status: "sent", type: "cart_recovery", sent_at: "Today 09:00" },
    ],
  },
  {
    id: "c5",
    contact: { id: "u5", name: "Lena G.", initials: "LG", avatar_bg: "#DBEAFE", avatar_color: "#1E40AF", platform: "instagram", first_contact: "2 days ago", status: "converted" },
    last_message: "Is the red one still available?",
    last_message_at: "2d",
    status: "resolved",
    unread: false,
    ai_scheduled: false,
    messages: [
      { id: "m11", conversation_id: "c5", content: "Is the red one still available?",                direction: "in",  timestamp: "2d ago", read: true },
      { id: "m12", conversation_id: "c5", content: "Yes! Red and blue are both in stock.",           direction: "out", timestamp: "2d ago", read: true },
      { id: "m13", conversation_id: "c5", content: "Amazing, I'll take the red one!",               direction: "in",  timestamp: "2d ago", read: true },
      { id: "m14", conversation_id: "c5", content: "Great! I've reserved it. Payment details sent.", direction: "out", timestamp: "2d ago", read: true },
    ],
    product_interest: { item: "Red Handbag", price: "$62", stock: 3, is_low_stock: false },
    follow_ups: [
      { id: "f4", conversation_id: "c5", contact_name: "Lena G.", title: "Upsell — matching belt", message: "Lena, this belt goes perfectly with...", status: "sent", type: "upsell", sent_at: "1d ago" },
    ],
  },
];

export const MOCK_AI_SUGGESTIONS: Record<string, AISuggestion> = {
  c1: { conversation_id: "c1", message: "Hey Miguel! Just checking in — we only have 2 pairs left in size 42. Want me to hold one for you?", type: "urgency" },
  c2: { conversation_id: "c2", message: "Hi Ana! Over 200 customers have bought this dress — it's one of our bestsellers this season. Still thinking about it?", type: "social_proof" },
  c3: { conversation_id: "c3", message: "Hi Kwame! Yes, we ship to Luanda. Delivery takes 3–5 business days. What were you looking for?", type: "cart_recovery" },
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const MOCK_KPIS: AnalyticsKPI[] = [
  { label: "Total conversations", value: "248", delta: "+18% this week", delta_positive: true, icon: "💬" },
  { label: "Follow-ups sent",     value: "91",  delta: "+32% this week", delta_positive: true, icon: "✉️" },
  { label: "Conversion rate",     value: "34%", delta: "+6pp vs last week", delta_positive: true, icon: "🎯" },
  { label: "Revenue recovered",   value: "$4,820", delta: "+$1,200 this week", delta_positive: true, icon: "💰" },
];

export const MOCK_CHART_DATA: ConversationDataPoint[] = [
  { date: "Mon", total: 32, followed_up: 18, converted: 9 },
  { date: "Tue", total: 28, followed_up: 14, converted: 6 },
  { date: "Wed", total: 41, followed_up: 22, converted: 11 },
  { date: "Thu", total: 38, followed_up: 20, converted: 8 },
  { date: "Fri", total: 52, followed_up: 31, converted: 14 },
  { date: "Sat", total: 35, followed_up: 19, converted: 7 },
  { date: "Sun", total: 22, followed_up: 12, converted: 5 },
];

export const MOCK_PLATFORM_STATS: PlatformStat[] = [
  { platform: "whatsapp", conversations: 128, conversions: 48, rate: 37 },
  { platform: "instagram", conversations: 84,  conversions: 26, rate: 31 },
  { platform: "facebook",  conversations: 36,  conversions: 10, rate: 28 },
];

// ─── Settings ─────────────────────────────────────────────────────────────────

export const MOCK_CHANNELS: ChannelConnection[] = [
  { platform: "whatsapp", connected: true,  account_name: "Shop & Go WA",    connected_at: "3 weeks ago" },
  { platform: "instagram", connected: true, account_name: "@shopandgo.ao",   connected_at: "2 weeks ago" },
  { platform: "facebook",  connected: false },
];

export const MOCK_AI_SETTINGS: AISettings = {
  follow_up_delay_hours: 6,
  use_urgency: true,
  use_upsell: true,
  use_social_proof: true,
  use_cart_recovery: true,
  tone: "friendly",
  language: "pt",
};
