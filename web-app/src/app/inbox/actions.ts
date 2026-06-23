"use server";

import { inboxConversationListService } from "./inbox-conversation-list.service";
import { inboxChatPanelService } from "./inbox-chat-panel.service";
import type { Conversation, AISuggestion, FollowUpType } from "@core/contracts";

export async function fetchConversationAction(id: string): Promise<Conversation | null> {
  return inboxConversationListService.fetchConversationById(id);
}

export async function fetchAISuggestionAction(conversationId: string): Promise<AISuggestion | null> {
  return inboxChatPanelService.fetchAISuggestion(conversationId);
}

export async function sendMessageAction(conversationId: string, content: string): Promise<void> {
  await inboxChatPanelService.sendMessage(conversationId, content);
}

export async function scheduleFollowUpAction(
  conversationId: string,
  message: string,
  delayHours: number,
  type: FollowUpType,
): Promise<void> {
  await inboxChatPanelService.scheduleFollowUp(conversationId, message, delayHours, type);
}

export async function markAsResolvedAction(conversationId: string): Promise<void> {
  await inboxChatPanelService.markAsResolved(conversationId);
}
