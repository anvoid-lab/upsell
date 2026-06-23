import "server-only";

import { BaseRepository } from "@core/repository";
import {
  AISuggestionContract,
  FollowUpContract,
  MessageContract,
  validateContract,
  type AISuggestion,
  type ConversationDoc,
  type FollowUp,
  type FollowUpType,
  type Message,
} from "@core/contracts";
import { createSupabaseServerClient } from "@db/client";

class InboxChatPanelService {
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

  private readonly aiSuggestions = new BaseRepository<AISuggestion>({
    table: "ai_suggestions",
    client: createSupabaseServerClient,
  });

  async fetchAISuggestion(conversationId: string): Promise<AISuggestion | null> {
    const docs = await this.aiSuggestions.findAll<AISuggestion>({
      filters: { conversation_id: conversationId } as Partial<AISuggestion>,
    });
    return AISuggestionContract.responseSchema.parse({ suggestion: docs[0] ?? null }).suggestion;
  }

  async sendMessage(conversationId: string, content: string): Promise<void> {
    validateContract(
      MessageContract.sendRequestSchema,
      { conversation_id: conversationId, content },
      "InboxChatPanelService.sendMessage",
    );
    const timestamp = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    await this.messages.create({ conversation_id: conversationId, content, direction: "out", timestamp, read: true });
  }

  async scheduleFollowUp(
    conversationId: string,
    message: string,
    delayHours: number,
    type: FollowUpType,
  ): Promise<void> {
    validateContract(
      FollowUpContract.scheduleRequestSchema,
      { conversation_id: conversationId, message, delay_hours: delayHours, type },
      "InboxChatPanelService.scheduleFollowUp",
    );
    const conv = await this.conversations.findById<ConversationDoc>(conversationId);
    const contactName = conv?.contact?.name ?? "Cliente";
    const scheduledFor = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();
    await this.followUps.create({
      conversation_id: conversationId,
      contact_name: contactName,
      title: `Follow-up — ${type}`,
      message,
      status: "scheduled",
      type,
      scheduled_for: scheduledFor,
    });
  }

  async markAsResolved(conversationId: string): Promise<void> {
    await this.conversations.update(conversationId, { status: "resolved" } as Partial<ConversationDoc>);
  }
}

export const inboxChatPanelService = new InboxChatPanelService();
