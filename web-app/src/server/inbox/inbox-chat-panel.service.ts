import "server-only";

import { BaseRepository } from "@core/repository";
import {
  FollowUpContract,
  InboxProviderError,
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

  private readonly followUps = new BaseRepository<FollowUp>({
    table: "follow_ups",
    client: createSupabaseServerClient,
  });

  async sendMessage(
    conversationId: string,
    content: string,
    clientMessageId: string,
  ): Promise<Message> {
    validateContract(
      MessageContract.sendRequestSchema,
      {
        conversation_id: conversationId,
        content,
        client_message_id: clientMessageId,
      },
      "InboxChatPanelService.sendMessage",
    );
    const delivery = await this.resolveDelivery(conversationId);
    const now = new Date();
    const pending = await this.createPendingMessage({
      conversation_id: conversationId,
      content,
      direction: "out",
      timestamp: now,
      read: false,
      channel_id: delivery.channelId,
      client_message_id: clientMessageId,
      delivery_status: "pending",
      delivery_updated_at: now,
    });
    return this.deliverMessage(pending, delivery);
  }

  async retryMessage(messageId: string): Promise<Message> {
    validateContract(
      MessageContract.retryRequestSchema,
      { message_id: messageId },
      "InboxChatPanelService.retryMessage",
    );
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("direction", "out")
      .is("deleted_at", null)
      .single();
    if (error || !data) throw error ?? new Error("Outbound message not found.");
    const message = validateContract(
      MessageContract.entitySchema,
      data,
      "InboxChatPanelService.retryMessage",
    );
    const delivery = await this.resolveDelivery(message.conversation_id);
    return this.deliverMessage(message, delivery);
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

  private async createPendingMessage(message: Partial<Message>): Promise<Message> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("messages")
      .insert(message)
      .select("*")
      .single();
    if (!error && data) {
      return validateContract(
        MessageContract.entitySchema,
        data,
        "InboxChatPanelService.createPendingMessage",
      );
    }
    if (error?.code !== "23505" || !message.client_message_id) throw error;

    const existing = await supabase
      .from("messages")
      .select("*")
      .eq("client_message_id", message.client_message_id)
      .is("deleted_at", null)
      .single();
    if (existing.error || !existing.data) throw existing.error ?? error;
    const parsed = validateContract(
      MessageContract.entitySchema,
      existing.data,
      "InboxChatPanelService.createPendingMessage.existing",
    );
    if (
      parsed.conversation_id !== message.conversation_id ||
      parsed.content !== message.content ||
      parsed.direction !== "out"
    ) {
      throw new Error("The client message ID is already used by another message.");
    }
    return parsed;
  }

  private async deliverMessage(
    message: Message,
    delivery: {
      provider: string;
      channelId: string;
      accountId: string;
      externalChatId: string;
    },
  ): Promise<Message> {
    if (message.delivery_status === "sent") return message;

    const supabase = await createSupabaseServerClient();
    const claimedAt = new Date();
    const claimedResult = await supabase
      .from("messages")
      .update({
        delivery_status: "sending",
        delivery_error: null,
        delivery_updated_at: claimedAt.toISOString(),
      })
      .eq("id", message.id)
      .eq("direction", "out")
      .in("delivery_status", ["pending", "failed"])
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();
    if (claimedResult.error) throw claimedResult.error;
    if (!claimedResult.data) return this.fetchMessage(message.id);

    const claimed = validateContract(
      MessageContract.entitySchema,
      claimedResult.data,
      "InboxChatPanelService.deliverMessage.claim",
    );

    let externalMessageId: string;
    try {
      const sent = await new InboxService(delivery.provider).sendMessage({
        accountId: delivery.accountId,
        externalChatId: delivery.externalChatId,
        text: claimed.content,
      });
      externalMessageId = sent.externalMessageId;
    } catch (providerError) {
      if (!(providerError instanceof InboxProviderError)) {
        // A network failure is ambiguous: the provider may have accepted the
        // message. Keep it pending so retry cannot send a duplicate blindly;
        // the outbound webhook can still reconcile it.
        return claimed;
      }
      const failed = await supabase
        .from("messages")
        .update({
          delivery_status: "failed",
          delivery_error: deliveryErrorMessage(providerError),
          delivery_updated_at: new Date().toISOString(),
        })
        .eq("id", claimed.id)
        .select("*")
        .single();
      if (failed.error || !failed.data) throw failed.error ?? providerError;
      return validateContract(
        MessageContract.entitySchema,
        failed.data,
        "InboxChatPanelService.deliverMessage.failed",
      );
    }

    const sentAt = new Date();
    const sent = await supabase
      .from("messages")
      .update({
        channel_message_id: externalMessageId,
        delivery_status: "sent",
        delivery_error: null,
        delivery_updated_at: sentAt.toISOString(),
      })
      .eq("id", claimed.id)
      .select("*")
      .single();

    if (sent.error || !sent.data) {
      // The provider accepted the message. Never turn this into a retryable
      // failure merely because the local confirmation write failed.
      return { ...claimed, channel_message_id: externalMessageId };
    }

    await this.conversations.update(message.conversation_id, {
      last_message: message.content,
      last_message_at: sentAt,
    } as Partial<ConversationDoc>);

    return validateContract(
      MessageContract.entitySchema,
      sent.data,
      "InboxChatPanelService.deliverMessage.sent",
    );
  }

  private async fetchMessage(messageId: string): Promise<Message> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .is("deleted_at", null)
      .single();
    if (error || !data) throw error ?? new Error("Message not found.");
    return validateContract(
      MessageContract.entitySchema,
      data,
      "InboxChatPanelService.fetchMessage",
    );
  }
}

export const inboxChatPanelService = new InboxChatPanelService();

function deliveryErrorMessage(error: InboxProviderError): string {
  if (error.status === 401 || error.status === 403) {
    return "Instagram connection expired. Reconnect the account and try again.";
  }
  if (error.status === 429) {
    return "Instagram rate limit reached. Try again shortly.";
  }
  if (error.status >= 500) {
    return "Instagram is temporarily unavailable. Try again.";
  }
  return "Instagram rejected the message. Check the content and try again.";
}
