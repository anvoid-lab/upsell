"use client";

import { useState, useEffect } from "react";
import type { Conversation, ConversationStatus } from "@/types";
import { inboxConversationListService } from "./inbox-conversation-list.service";

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
  statusOverrides: Record<string, ConversationStatus> = {}
): UseConversationListReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<ConversationStatus>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    inboxConversationListService.fetchConversations().then((data) => {
      setConversations(data);
      setIsLoading(false);
    });
  }, []);

  const withOverrides = conversations.map(c =>
    statusOverrides[c.id] ? { ...c, status: statusOverrides[c.id] } : c
  );
  const byStatus = inboxConversationListService.filterByStatus(withOverrides, activeTab);
  const filtered = searchQuery
    ? inboxConversationListService.searchConversations(byStatus, searchQuery)
    : byStatus;
  const unreadCount = inboxConversationListService.countUnread(withOverrides);

  return {
    conversations: withOverrides,
    filtered,
    activeTab,
    searchQuery,
    unreadCount,
    isLoading,
    setActiveTab,
    setSearchQuery,
  };
}
