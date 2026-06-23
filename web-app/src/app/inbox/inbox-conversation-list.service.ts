import "server-only";

import { BaseRepository } from "@core/repository";
import {
  ConversationContract,
  type Conversation,
  type ConversationStatus,
  type Platform,
} from "@core/contracts";
import { mongodbConnection } from "@db/client";
import { MOCK_CONVERSATIONS } from "@/lib/mock-data";

class InboxConversationListService {
  private readonly conversations = new BaseRepository<Conversation>({
    collection: "conversations",
    client: mongodbConnection,
  });

  async fetchConversations(): Promise<Conversation[]> {
    await new Promise((r) => setTimeout(r, 300));
    return ConversationContract.listResponseSchema.parse({
      conversations: MOCK_CONVERSATIONS,
    }).conversations;
  }

  async fetchConversationById(id: string): Promise<Conversation | null> {
    await new Promise((r) => setTimeout(r, 100));
    const conversation = MOCK_CONVERSATIONS.find((c) => c.id === id) ?? null;
    return ConversationContract.detailResponseSchema.parse({ conversation }).conversation;
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
        c.last_message.toLowerCase().includes(q)
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
