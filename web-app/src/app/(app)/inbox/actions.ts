"use server";

import { inboxConversationListService } from "./inbox-conversation-list.service";
import { inboxChatPanelService } from "./inbox-chat-panel.service";
import type { Conversation, AISuggestion, FollowUpType, Message } from "@core/contracts";

export async function fetchConversationAction(id: string): Promise<Conversation | null> {
  return inboxConversationListService.fetchConversationById(id);
}

export async function fetchAISuggestionAction(
  conversationId: string,
  options?: { force?: boolean },
): Promise<AISuggestion | null> {
  return inboxChatPanelService.fetchAISuggestion(conversationId, options);
}

export async function sendMessageAction(
  conversationId: string,
  content: string,
): Promise<Message> {
  return inboxChatPanelService.sendMessage(conversationId, content);
}

export async function markAsReadAction(conversationId: string): Promise<void> {
  await inboxChatPanelService.markAsRead(conversationId);
}

export async function touchConversationViewAction(conversationId: string): Promise<void> {
  await inboxChatPanelService.touchViewing(conversationId);
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
