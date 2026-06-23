import type { AISuggestion, FollowUpType } from "@/types";
import { MOCK_AI_SUGGESTIONS } from "@/lib/mock-data";

class InboxChatPanelService {
  async fetchAISuggestion(conversationId: string): Promise<AISuggestion | null> {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_AI_SUGGESTIONS[conversationId] ?? null;
  }

  async sendMessage(conversationId: string, message: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
    console.log("[service] sendMessage", { conversationId, message });
  }

  async scheduleFollowUp(
    conversationId: string,
    message: string,
    delayHours: number,
    type: FollowUpType
  ): Promise<void> {
    await new Promise((r) => setTimeout(r, 500));
    console.log("[service] scheduleFollowUp", { conversationId, message, delayHours, type });
  }

  async markAsResolved(conversationId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
    console.log("[service] markAsResolved", { conversationId });
  }
}

export const inboxChatPanelService = new InboxChatPanelService();
