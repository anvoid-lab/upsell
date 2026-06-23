"use client";

import { useState } from "react";
import type { Conversation, ConversationStatus } from "@/types";

interface UseConversationListReturn {
  conversations: Conversation[];
  filtered: Conversation[];
  activeTab: ConversationStatus;
  searchQuery: string;
  unreadCount: number;
  isLoading: boolean;
  setActiveTab: (tab: ConversationStatus) => void;
  setSearchQuery: (q: string) => void;
}

export function useConversationList(
  selectedId: string | null,
  statusOverrides: Record<string, ConversationStatus> = {},
  initialConversations: Conversation[] = [],
): UseConversationListReturn {
  const [conversations] = useState<Conversation[]>(initialConversations);
  const [activeTab, setActiveTab] = useState<ConversationStatus>("open");
  const [searchQuery, setSearchQuery] = useState("");

  const withOverrides = conversations.map((c) =>
    statusOverrides[c.id] ? { ...c, status: statusOverrides[c.id] } : c,
  );

  const byStatus = withOverrides.filter((c) => c.status === activeTab);

  const filtered = searchQuery.trim()
    ? byStatus.filter(
        (c) =>
          c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.last_message.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : byStatus;

  const unreadCount = withOverrides.filter((c) => c.unread).length;

  return {
    conversations: withOverrides,
    filtered,
    activeTab,
    searchQuery,
    unreadCount,
    isLoading: false,
    setActiveTab,
    setSearchQuery,
  };
}
