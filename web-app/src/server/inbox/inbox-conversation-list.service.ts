import "server-only";

import { BaseRepository } from "@core/repository";
import {
  ConversationContract,
  type Conversation,
  type ConversationDoc,
  type FollowUp,
  type Message,
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
      this.conversations.findAll<ConversationDoc>({
        orderBy: { column: "last_message_at", ascending: false },
      }),
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
      this.messages.findAll<Message>({
        filters: { conversation_id: id } as Partial<Message>,
        orderBy: { column: "timestamp", ascending: true },
      }),
      this.followUps.findAll<FollowUp>({ filters: { conversation_id: id } as Partial<FollowUp> }),
    ]);
    if (!doc) return null;
    return ConversationContract.detailResponseSchema.parse({
      conversation: { ...doc, follow_ups: followUps, messages: msgs },
    }).conversation;
  }

}

export const inboxConversationListService = new InboxConversationListService();
