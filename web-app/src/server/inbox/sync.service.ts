import "server-only";

import { createSupabaseServiceClient } from "@db/client";
import type {
  InboxChannel,
  InboxProvider,
  ProviderChat,
  NormalizedInboxMessage,
} from "@core/contracts/inbox.contract";

export class InboxSyncService {
  async syncAccount(
    provider: InboxProvider,
    providerAccountId: string,
    inboxChannel: InboxChannel,
  ): Promise<void> {
    const supabase = createSupabaseServiceClient();
    const { data: channel, error } = await supabase
      .from("channels")
      .select("id, business_id")
      .eq("provider", provider.name)
      .eq("provider_account_id", providerAccountId)
      .eq("platform", inboxChannel)
      .is("deleted_at", null)
      .single();
    if (error || !channel) throw error ?? new Error("Inbox account not found.");

    await supabase
      .from("channels")
      .update({ connection_status: "syncing", connected: true })
      .eq("id", channel.id)
      .eq("business_id", channel.business_id);

    try {
      const chats = await provider.listChats(providerAccountId, inboxChannel);
      for (const chat of chats) {
        const messages = await provider.listMessages(chat.externalChatId);
        await this.persistChat(
          channel.id,
          channel.business_id,
          inboxChannel,
          chat,
          messages,
        );
      }
      const { error: finishError } = await supabase
        .from("channels")
        .update({
          connection_status: "connected",
          connected: true,
        })
        .eq("id", channel.id)
        .eq("business_id", channel.business_id);
      if (finishError) throw finishError;
    } catch (syncError) {
      await supabase
        .from("channels")
        .update({ connection_status: "error" })
        .eq("id", channel.id)
        .eq("business_id", channel.business_id);
      throw syncError;
    }
  }

  private async persistChat(
    channelId: string,
    businessId: string,
    inboxChannel: InboxChannel,
    chat: ProviderChat,
    messages: NormalizedInboxMessage[],
  ) {
    if (!messages.length && !chat.occurredAt) return;
    const supabase = createSupabaseServiceClient();
    const sorted = [...messages].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    );
    const first = sorted[0];
    const last = sorted.at(-1);
    const conversationResult = await supabase
      .from("conversations")
      .select("id")
      .eq("business_id", businessId)
      .eq("channel_id", channelId)
      .eq("channel_conversation_id", chat.externalChatId)
      .is("deleted_at", null)
      .maybeSingle();
    let conversation = conversationResult.data;
    if (conversationResult.error) throw conversationResult.error;

    const occurredAt = last?.occurredAt ?? chat.occurredAt ?? new Date();
    const values = {
      business_id: businessId,
      channel_id: channelId,
      channel_conversation_id: chat.externalChatId,
      contact: {
        id: chat.participantId,
        name: chat.name,
        initials: initials(chat.name),
        avatar_bg: "#dcfce7",
        avatar_color: "#15803d",
        platform: inboxChannel,
        ...(inboxChannel === "whatsapp"
          ? { phone: chat.participantId }
          : { username: chat.participantId }),
        first_contact: (first?.occurredAt ?? occurredAt).toISOString(),
        status: "new",
      },
      last_message: last ? messageSummary(last) : `${channelLabel(inboxChannel)} conversation`,
      last_message_at: occurredAt.toISOString(),
      unread: chat.unread,
    };

    if (!conversation) {
      const created = await supabase
        .from("conversations")
        .insert({ ...values, status: "open" })
        .select("id")
        .single();
      if (created.error?.code === "23505") {
        const raced = await supabase
          .from("conversations")
          .select("id")
          .eq("business_id", businessId)
          .eq("channel_id", channelId)
          .eq("channel_conversation_id", chat.externalChatId)
          .single();
        if (raced.error) throw raced.error;
        conversation = raced.data;
      } else if (created.error) {
        throw created.error;
      } else {
        conversation = created.data;
      }
    } else {
      const updated = await supabase
        .from("conversations")
        .update(values)
        .eq("id", conversation.id)
        .eq("business_id", businessId);
      if (updated.error) throw updated.error;
    }

    if (!conversation || !messages.length) return;
    const rows = messages.map((message) => ({
      business_id: businessId,
      channel_id: channelId,
      conversation_id: conversation.id,
      channel_message_id: message.externalMessageId,
      content: message.text,
      attachment: message.attachments,
      direction: message.direction,
      timestamp: message.occurredAt.toISOString(),
      read: message.seen,
      delivery_status: message.direction === "out"
        ? message.seen ? "read" : message.delivered ? "delivered" : "sent"
        : null,
      delivery_updated_at:
        message.direction === "out" ? message.occurredAt.toISOString() : null,
      delivered_at: message.delivered ? message.occurredAt.toISOString() : null,
      read_at: message.seen ? message.occurredAt.toISOString() : null,
      edited_at: message.edited ? message.occurredAt.toISOString() : null,
      provider_deleted_at: message.deleted ? message.occurredAt.toISOString() : null,
      hidden: message.hidden,
      reactions: message.reactions.map((reaction) => ({
        value: reaction.value,
        sender_id: reaction.senderId,
        direction: reaction.direction,
        occurred_at: reaction.occurredAt?.toISOString() ?? null,
      })),
      quoted_message: message.quotedMessage ? {
        external_message_id: message.quotedMessage.externalMessageId,
        text: message.quotedMessage.text,
        attachments: message.quotedMessage.attachments,
        direction: message.quotedMessage.direction,
      } : null,
      provider_metadata: message.metadata,
    }));
    const inserted = await supabase.from("messages").insert(rows);
    if (inserted.error?.code !== "23505" && inserted.error)
      throw inserted.error;
    if (inserted.error?.code === "23505") {
      for (const row of rows) {
        const retry = await supabase.from("messages").insert(row);
        if (retry.error?.code === "23505") {
          const refreshed = await supabase
            .from("messages")
            .update(row)
            .eq("business_id", businessId)
            .eq("channel_id", channelId)
            .eq("channel_message_id", row.channel_message_id);
          if (refreshed.error) throw refreshed.error;
        } else if (retry.error) {
          throw retry.error;
        }
      }
    }

    // Resolve the relational link after all messages have been inserted. The
    // snapshot above remains the fallback when the quoted message is outside
    // the synchronized history window.
    for (const message of messages) {
      const quotedId = message.quotedMessage?.externalMessageId;
      if (!quotedId) continue;
      const target = await supabase
        .from("messages")
        .select("id")
        .eq("business_id", businessId)
        .eq("conversation_id", conversation.id)
        .eq("channel_message_id", quotedId)
        .is("deleted_at", null)
        .maybeSingle();
      if (target.error) throw target.error;
      if (!target.data) continue;
      const linked = await supabase
        .from("messages")
        .update({ reply_to_message_id: target.data.id })
        .eq("business_id", businessId)
        .eq("conversation_id", conversation.id)
        .eq("channel_message_id", message.externalMessageId);
      if (linked.error) throw linked.error;
    }
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "?"}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}

export const inboxSyncService = new InboxSyncService();

function channelLabel(channel: InboxChannel) {
  return channel === "whatsapp" ? "WhatsApp" : "Instagram";
}

function messageSummary(message: NormalizedInboxMessage) {
  if (message.text.trim()) return message.text;
  if (message.attachments.length === 1) return "Media";
  if (message.attachments.length > 1) return `${message.attachments.length} attachments`;
  return "Message";
}
