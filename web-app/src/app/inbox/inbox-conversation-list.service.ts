import type { Conversation, ConversationStatus, Platform } from "@/types";
import { MOCK_CONVERSATIONS } from "@/lib/mock-data";

class InboxConversationListService {
  async fetchConversations(): Promise<Conversation[]> {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_CONVERSATIONS;
  }

  async fetchConversationById(id: string): Promise<Conversation | null> {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_CONVERSATIONS.find((c) => c.id === id) ?? null;
  }

  filterByStatus(conversations: Conversation[], status: ConversationStatus): Conversation[] {
    return conversations.filter((c) => c.status === status);
  }

  filterByPlatform(conversations: Conversation[], platform: Platform): Conversation[] {
    return conversations.filter((c) => c.contact.platform === platform);
  }

  searchConversations(conversations: Conversation[], query: string): Conversation[] {
    const q = query.toLowerCase();
    return conversations.filter(
      (c) =>
        c.contact.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }

  countUnread(conversations: Conversation[]): number {
    return conversations.filter((c) => c.unread).length;
  }

  countByStatus(conversations: Conversation[], status: ConversationStatus): number {
    return conversations.filter((c) => c.status === status).length;
  }
}

export const inboxConversationListService = new InboxConversationListService();
