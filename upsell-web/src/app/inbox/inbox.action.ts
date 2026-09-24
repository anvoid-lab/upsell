"use server";

import { inboxConversationListService } from "@server/inbox/inbox-conversation-list.service";
import { inboxChatPanelService } from "@server/inbox/inbox-chat-panel.service";
import type {
   Conversation,
   ConversationNote,
   ConversationStatus,
   FollowUpType,
   Message,
} from "../../core/contracts";

export async function fetchConversationAction(id: string): Promise<Conversation | null> {
   return inboxConversationListService.fetchConversationById(id);
}

export async function sendMessageAction(
   formData: FormData,
): Promise<Message> {
   const conversationId = String(formData.get("conversation_id") ?? "");
   const content = String(formData.get("content") ?? "");
   const clientMessageId = String(formData.get("client_message_id") ?? "");
   const attachments = formData
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0);
   return inboxChatPanelService.sendMessage(
      conversationId,
      content,
      clientMessageId,
      attachments,
   );
}

export async function retryMessageAction(messageId: string): Promise<Message> {
   return inboxChatPanelService.retryMessage(messageId);
}

export async function markAsReadAction(conversationId: string): Promise<void> {
   await inboxChatPanelService.markAsRead(conversationId);
}

export async function scheduleFollowUpAction(
   conversationId: string,
   message: string,
   delayHours: number,
   type: FollowUpType,
): Promise<void> {
   await inboxChatPanelService.scheduleFollowUp(conversationId, message, delayHours, type);
}

export async function updateConversationStatusAction(
   conversationId: string,
   status: ConversationStatus,
): Promise<ConversationStatus> {
   return inboxChatPanelService.updateConversationStatus(conversationId, status);
}

export async function addConversationNoteAction(
   conversationId: string,
   content: string,
): Promise<ConversationNote> {
   return inboxChatPanelService.addNote(conversationId, content);
}
