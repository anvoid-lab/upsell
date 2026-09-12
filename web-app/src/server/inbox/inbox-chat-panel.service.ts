import "server-only";

import { BaseRepository } from "@core/repository";
import {
  FollowUpContract,
  MessageContract,
  validateContract,
  type ConversationDoc,
  type FollowUp,
  type FollowUpType,
  type Message,
} from "@core/contracts";
import { createSupabaseServerClient } from "@db/client";
import { InboxService } from "./inbox.service";

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

  /**
   * Return the created row so the panel can reconcile its local message with
   * the same row later delivered by Realtime without rendering a duplicate.
   */
  async sendMessage(conversationId: string, content: string): Promise<Message> {
    validateContract(
      MessageContract.sendRequestSchema,
      { conversation_id: conversationId, content },
      "InboxChatPanelService.sendMessage",
    );
    const delivery = await this.resolveDelivery(conversationId);
    const sent = await new InboxService(delivery.provider).sendMessage({
      accountId: delivery.accountId,
      externalChatId: delivery.externalChatId,
      text: content,
    });
    const now = new Date();
    // The database generates the bigint ID.
    const created = await this.persistSentMessage({
      conversation_id: conversationId,
      content,
      direction: "out",
      timestamp: now,
      read: true,
      channel_id: delivery.channelId,
      channel_message_id: sent.externalMessageId,
    } as Partial<Message>, sent.externalMessageId);
    // Keep the conversation at the top of the list ordered by last_message_at.
    await this.conversations.update(conversationId, {
      last_message: content,
      last_message_at: now,
    } as Partial<ConversationDoc>);

    return validateContract(
      MessageContract.entitySchema,
      created,
      "InboxChatPanelService.sendMessage",
    );
  }

  /** Clear the unread badge when a seller opens the conversation. */
  async markAsRead(conversationId: string): Promise<void> {
    await this.conversations.update(conversationId, {
      unread: false,
    } as Partial<ConversationDoc>);

    const delivery = await this.resolveOptionalDelivery(conversationId);
    if (!delivery) return;
    try {
      await new InboxService(delivery.provider).markChatRead({
        accountId: delivery.accountId,
        externalChatId: delivery.externalChatId,
      });
    } catch {
      // Reading a local conversation must not fail when provider state is stale.
    }
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
    const contactName = conv?.contact?.name ?? "Customer";
    const scheduledFor = new Date(Date.now() + delayHours * 60 * 60 * 1000);
    // The database generates the bigint ID.
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

  private async resolveDelivery(conversationId: string): Promise<{
    provider: string;
    channelId: string;
    accountId: string;
    externalChatId: string;
  }> {
    const supabase = await createSupabaseServerClient();
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("channel_id, channel_conversation_id")
      .eq("id", conversationId)
      .is("deleted_at", null)
      .single();
    if (error || !conversation?.channel_id || !conversation.channel_conversation_id) {
      throw error ?? new Error("Conversation is not linked to an inbox provider.");
    }
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("provider, provider_account_id, connected")
      .eq("id", conversation.channel_id)
      .is("deleted_at", null)
      .single();
    if (channelError || !channel?.connected || !channel.provider_account_id) {
      throw channelError ?? new Error("Inbox account is not connected.");
    }
    return {
      provider: channel.provider as string,
      channelId: conversation.channel_id as string,
      accountId: channel.provider_account_id as string,
      externalChatId: conversation.channel_conversation_id as string,
    };
  }

  private async resolveOptionalDelivery(conversationId: string): Promise<{
    provider: string;
    channelId: string;
    accountId: string;
    externalChatId: string;
  } | null> {
    try {
      return await this.resolveDelivery(conversationId);
    } catch {
      return null;
    }
  }

  private async persistSentMessage(
    message: Partial<Message>,
    externalMessageId: string,
  ): Promise<Message> {
    try {
      return await this.messages.create<Message>(message);
    } catch (writeError) {
      // The Unipile webhook can arrive before the HTTP send response. In that
      // race the webhook has already inserted the same provider message id.
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_message_id", externalMessageId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error || !data) throw writeError;
      return validateContract(
        MessageContract.entitySchema,
        data,
        "InboxChatPanelService.persistSentMessage",
      );
    }
  }
}

export const inboxChatPanelService = new InboxChatPanelService();
