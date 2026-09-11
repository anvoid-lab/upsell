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
   * Devolve a linha criada — não é cosmético. O painel acrescenta a mensagem
   * localmente ao enviar, e o Realtime entrega a seguir a mesma linha; sem o id
   * real da BD para comparar, as duas cópias renderizavam como duas bolhas.
   */
  async sendMessage(conversationId: string, content: string): Promise<Message> {
    validateContract(
      MessageContract.sendRequestSchema,
      { conversation_id: conversationId, content },
      "InboxChatPanelService.sendMessage",
    );
    const now = new Date();
    // id é bigint gerado pela BD (migração 004) — não se especifica aqui.
    const created = await this.messages.create<Message>({
      conversation_id: conversationId,
      content,
      direction: "out",
      timestamp: now,
      read: true,
    });
    // Manter a conversa no topo da lista — a ordenação é por last_message_at.
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

  /** Limpa o badge de não-lida quando o vendedor abre a conversa. */
  async markAsRead(conversationId: string): Promise<void> {
    await this.conversations.update(conversationId, {
      unread: false,
    } as Partial<ConversationDoc>);
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
    const scheduledFor = new Date(Date.now() + delayHours * 60 * 60 * 1000);
    // id é bigint gerado pela BD (migração 004) — não se especifica aqui.
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
