import type {
  Conversation,
  AISuggestion,
  AnalyticsKPI,
  ConversationDataPoint,
  PlatformStat,
  ChannelConnection,
  AISettings,
} from "@/types";

// ─── Conversations ────────────────────────────────────────────────────────

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    contact: { id: "u1", name: "Miguel João", initials: "MJ", avatarBg: "#EDE9FE", avatarColor: "#4338CA", platform: "whatsapp", phone: "+244 923 456 789", firstContact: "Today", status: "interested" },
    lastMessage: "How much are the Nike Air trainers?",
    lastMessageAt: "2m",
    status: "open",
    unread: true,
    aiScheduled: false,
    messages: [
      { id: "m1", conversationId: "c1", content: "How much are the Nike Air trainers?", direction: "in", timestamp: "10:42", read: true },
      { id: "m2", conversationId: "c1", content: "They're $45, available in sizes 40 to 44.", direction: "out", timestamp: "10:44", read: true },
      { id: "m3", conversationId: "c1", content: "Ok, I'll think about it.", direction: "in", timestamp: "10:45", read: true },
    ],
    productInterest: { item: "Nike Air", price: "$45", stock: 2, isLowStock: true },
    followUps: [
      { id: "f1", conversationId: "c1", contactName: "Miguel João", title: "Urgency message", message: "Only 2 pairs left in your size...", status: "scheduled", type: "urgency", scheduledFor: "Sends in 6 hours" },
    ],
  },
  {
    id: "c2",
    contact: { id: "u2", name: "Ana Silva", initials: "AS", avatarBg: "#FCE7F3", avatarColor: "#9D174D", platform: "instagram", firstContact: "Yesterday", status: "interested" },
    lastMessage: "I'll think about it and get back to you",
    lastMessageAt: "1h",
    status: "open",
    unread: false,
    aiScheduled: true,
    messages: [
      { id: "m4", conversationId: "c2", content: "Do you have the summer dress in size S?", direction: "in", timestamp: "09:10", read: true },
      { id: "m5", conversationId: "c2", content: "Yes! We have it in S, M and L. Price is $38.", direction: "out", timestamp: "09:15", read: true },
      { id: "m6", conversationId: "c2", content: "I'll think about it and get back to you", direction: "in", timestamp: "09:16", read: true },
    ],
    productInterest: { item: "Summer Dress", price: "$38", stock: 5, isLowStock: false },
    followUps: [
      { id: "f2", conversationId: "c2", contactName: "Ana Silva", title: "Social proof", message: "Other customers loved this dress...", status: "scheduled", type: "social_proof", scheduledFor: "Sends in 3 hours" },
    ],
  },
  {
    id: "c3",
    contact: { id: "u3", name: "Kwame M.", initials: "KM", avatarBg: "#DCFCE7", avatarColor: "#166534", platform: "facebook", firstContact: "Today", status: "new" },
    lastMessage: "Do you ship to Luanda?",
    lastMessageAt: "3h",
    status: "open",
    unread: true,
    aiScheduled: false,
    messages: [
      { id: "m7", conversationId: "c3", content: "Do you ship to Luanda?", direction: "in", timestamp: "08:00", read: true },
    ],
    followUps: [],
  },
  {
    id: "c4",
    contact: { id: "u4", name: "Pedro C.", initials: "PC", avatarBg: "#FEF3C7", avatarColor: "#92400E", platform: "whatsapp", firstContact: "Yesterday", status: "interested" },
    lastMessage: "Thanks, I'll buy it tomorrow!",
    lastMessageAt: "Yesterday",
    status: "pending",
    unread: false,
    aiScheduled: false,
    messages: [
      { id: "m8", conversationId: "c4", content: "Is the leather jacket still available?", direction: "in", timestamp: "Yesterday 14:00", read: true },
      { id: "m9", conversationId: "c4", content: "Yes it is! Only 1 left in stock.", direction: "out", timestamp: "Yesterday 14:05", read: true },
      { id: "m10", conversationId: "c4", content: "Thanks, I'll buy it tomorrow!", direction: "in", timestamp: "Yesterday 14:10", read: true },
    ],
    productInterest: { item: "Leather Jacket", price: "$89", stock: 1, isLowStock: true },
    followUps: [
      { id: "f3", conversationId: "c4", contactName: "Pedro C.", title: "Cart recovery", message: "Hey Pedro, are you still interested?", status: "sent", type: "cart_recovery", sentAt: "Today 09:00" },
    ],
  },
  {
    id: "c5",
    contact: { id: "u5", name: "Lena G.", initials: "LG", avatarBg: "#DBEAFE", avatarColor: "#1E40AF", platform: "instagram", firstContact: "2 days ago", status: "converted" },
    lastMessage: "Is the red one still available?",
    lastMessageAt: "2d",
    status: "resolved",
    unread: false,
    aiScheduled: false,
    messages: [
      { id: "m11", conversationId: "c5", content: "Is the red one still available?", direction: "in", timestamp: "2d ago", read: true },
      { id: "m12", conversationId: "c5", content: "Yes! Red and blue are both in stock.", direction: "out", timestamp: "2d ago", read: true },
      { id: "m13", conversationId: "c5", content: "Amazing, I'll take the red one!", direction: "in", timestamp: "2d ago", read: true },
      { id: "m14", conversationId: "c5", content: "Great! I've reserved it. Payment details sent.", direction: "out", timestamp: "2d ago", read: true },
    ],
    productInterest: { item: "Red Handbag", price: "$62", stock: 3, isLowStock: false },
    followUps: [
      { id: "f4", conversationId: "c5", contactName: "Lena G.", title: "Upsell — matching belt", message: "Lena, this belt goes perfectly with...", status: "sent", type: "upsell", sentAt: "1d ago" },
    ],
  },
];

export const MOCK_AI_SUGGESTIONS: Record<string, AISuggestion> = {
  c1: { conversationId: "c1", message: "Hey Miguel! Just checking in — we only have 2 pairs left in size 42. Want me to hold one for you?", type: "urgency" },
  c2: { conversationId: "c2", message: "Hi Ana! Over 200 customers have bought this dress — it's one of our bestsellers this season. Still thinking about it?", type: "social_proof" },
  c3: { conversationId: "c3", message: "Hi Kwame! Yes, we ship to Luanda. Delivery takes 3–5 business days. What were you looking for?", type: "cart_recovery" },
};

// ─── Analytics ────────────────────────────────────────────────────────────

export const MOCK_KPIS: AnalyticsKPI[] = [
  { label: "Total conversations", value: "248", delta: "+18% this week", deltaPositive: true, icon: "💬" },
  { label: "Follow-ups sent", value: "91", delta: "+32% this week", deltaPositive: true, icon: "✉️" },
  { label: "Conversion rate", value: "34%", delta: "+6pp vs last week", deltaPositive: true, icon: "🎯" },
  { label: "Revenue recovered", value: "$4,820", delta: "+$1,200 this week", deltaPositive: true, icon: "💰" },
];

export const MOCK_CHART_DATA: ConversationDataPoint[] = [
  { date: "Mon", total: 32, followedUp: 18, converted: 9 },
  { date: "Tue", total: 28, followedUp: 14, converted: 6 },
  { date: "Wed", total: 41, followedUp: 22, converted: 11 },
  { date: "Thu", total: 38, followedUp: 20, converted: 8 },
  { date: "Fri", total: 52, followedUp: 31, converted: 14 },
  { date: "Sat", total: 35, followedUp: 19, converted: 7 },
  { date: "Sun", total: 22, followedUp: 12, converted: 5 },
];

export const MOCK_PLATFORM_STATS: PlatformStat[] = [
  { platform: "whatsapp", conversations: 128, conversions: 48, rate: 37 },
  { platform: "instagram", conversations: 84, conversions: 26, rate: 31 },
  { platform: "facebook", conversations: 36, conversions: 10, rate: 28 },
];

// ─── Settings ────────────────────────────────────────────────────────────

export const MOCK_CHANNELS: ChannelConnection[] = [
  { platform: "whatsapp", connected: true, accountName: "Shop & Go WA", connectedAt: "3 weeks ago" },
  { platform: "instagram", connected: true, accountName: "@shopandgo.ao", connectedAt: "2 weeks ago" },
  { platform: "facebook", connected: false },
];

export const MOCK_AI_SETTINGS: AISettings = {
  followUpDelayHours: 6,
  useUrgency: true,
  useUpsell: true,
  useSocialProof: true,
  useCartRecovery: true,
  tone: "friendly",
  language: "pt",
};
