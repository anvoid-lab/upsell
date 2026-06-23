import "server-only";

import { BaseRepository } from "@core/repository";
import {
  ConversationContract,
  type Conversation,
  type ConversationDoc,
  type ConversationStatus,
  type FollowUp,
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

  private readonly followUps = new BaseRepository<FollowUp>({
    table: "follow_ups",
    client: createSupabaseServerClient,
  });

  async fetchConversations(): Promise<Conversation[]> {
    const [docs, allFollowUps] = await Promise.all([
      this.conversations.findAll<ConversationDoc>(),
      this.followUps.findAll<FollowUp>(),
    ]);

    const followUpsByConv = allFollowUps.reduce<Record<string, FollowUp[]>>((acc, fu) => {
      (acc[fu.conversation_id] ??= []).push(fu);
      return acc;
    }, {});

    const docsWithFollowUps = docs.map((doc) => ({
      ...doc,
      follow_ups: followUpsByConv[doc.id] ?? [],
    }));

    return ConversationContract.listResponseSchema.parse({ conversations: docsWithFollowUps }).conversations;
  }

  async fetchConversationById(id: string): Promise<Conversation | null> {
    const [doc, msgs, followUps] = await Promise.all([
      this.conversations.findById<ConversationDoc>(id),
      this.messages.findAll<Message>({ filters: { conversation_id: id } as Partial<Message> }),
      this.followUps.findAll<FollowUp>({ filters: { conversation_id: id } as Partial<FollowUp> }),
    ]);
    if (!doc) return null;
    return ConversationContract.detailResponseSchema.parse({
      conversation: { ...doc, follow_ups: followUps, messages: msgs },
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
