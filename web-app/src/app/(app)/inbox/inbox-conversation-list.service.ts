import "server-only";

import { BaseRepository } from "@core/repository";
import {
  ConversationContract,
  type Conversation,
  type ConversationDoc,
  type ConversationStatus,
  type Message,
  type Platform,
} from "@core/contracts";
import { createSupabaseServerClient } from "@db/client";

class InboxConversationListService {
  private readonly conversations = new BaseRepository<ConversationDoc>({
    table: "conversations",
    client: createSupabaseServerClient,
  });

  private readonly messages = new BaseRepository<Message>({
    table: "messages",
    client: createSupabaseServerClient,
  });

  async fetchConversations(): Promise<Conversation[]> {
    const docs = await this.conversations.findAll<ConversationDoc>();
    return ConversationContract.listResponseSchema.parse({ conversations: docs }).conversations;
  }

  async fetchConversationById(id: string): Promise<Conversation | null> {
    const [doc, msgs] = await Promise.all([
      this.conversations.findById<ConversationDoc>(id),
      this.messages.findAll<Message>({ filters: { conversation_id: id } as Partial<Message> }),
    ]);
    if (!doc) return null;
    return ConversationContract.detailResponseSchema.parse({
      conversation: { ...doc, messages: msgs },
    }).conversation;
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
