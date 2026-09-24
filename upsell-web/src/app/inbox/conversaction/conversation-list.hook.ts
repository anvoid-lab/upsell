"use client";

import { useState } from "react";
import type { Conversation, ConversationStatus } from "@/types";

export type ConversationListFilter = ConversationStatus | "all";

interface UseConversationListReturn {
  conversations: Conversation[];
  filtered: Conversation[];
  activeTab: ConversationListFilter;
  searchQuery: string;
  unreadCount: number;
  isLoading: boolean;
  setActiveTab: (tab: ConversationListFilter) => void;
  setSearchQuery: (q: string) => void;
}

/**
 * Só filtragem e pesquisa. A lista em si vive no InboxView, que é quem detém a
 * subscrição Realtime — mantê-la aqui obrigava a sincronizar duas cópias.
 */
export function useConversationList(
  selectedId: string | null,
  statusOverrides: Record<string, ConversationStatus> = {},
  conversations: Conversation[] = [],
): UseConversationListReturn {
  const [activeTab, setActiveTab] = useState<ConversationListFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const withOverrides = conversations.map((c) =>
    statusOverrides[c.id] ? { ...c, status: statusOverrides[c.id] } : c,
  );

  // Mais recente primeiro — é isto que faz uma conversa saltar para o topo
  // quando chega uma mensagem nova.
  const byStatus = withOverrides
    .filter((c) => activeTab === "all" || c.status === activeTab)
    .sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime(),
    );

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
