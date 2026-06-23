import "server-only";

import { BaseRepository } from "@core/repository";
import {
  AISuggestionContract,
  FollowUpContract,
  MessageContract,
  validateContract,
  type AISuggestion,
  type FollowUp,
  type FollowUpType,
  type Message,
} from "@core/contracts";
import { mongodbConnection } from "@db/client";
import { MOCK_AI_SUGGESTIONS } from "@/lib/mock-data";

class InboxChatPanelService {
  private readonly messages = new BaseRepository<Message>({
    collection: "messages",
    client: mongodbConnection,
  });

  private readonly followUps = new BaseRepository<FollowUp>({
    collection: "followUps",
    client: mongodbConnection,
  });

  async fetchAISuggestion(conversationId: string): Promise<AISuggestion | null> {
    await new Promise((r) => setTimeout(r, 400));
    const suggestion = MOCK_AI_SUGGESTIONS[conversationId] ?? null;
    return AISuggestionContract.responseSchema.parse({ suggestion }).suggestion;
  }

  async sendMessage(conversationId: string, message: string): Promise<void> {
    validateContract(
      MessageContract.sendRequestSchema,
      { conversation_id: conversationId, content: message },
      "InboxChatPanelService.sendMessage",
    );
    await new Promise((r) => setTimeout(r, 600));
  }

  async scheduleFollowUp(
    conversationId: string,
    message: string,
    delayHours: number,
    type: FollowUpType
  ): Promise<void> {
    validateContract(
      FollowUpContract.scheduleRequestSchema,
      { conversation_id: conversationId, message, delay_hours: delayHours, type },
      "InboxChatPanelService.scheduleFollowUp",
    );
    await new Promise((r) => setTimeout(r, 500));
  }

  async markAsResolved(conversationId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
  }
}

export const inboxChatPanelService = new InboxChatPanelService();
