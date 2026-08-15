import "server-only";

import { BaseRepository } from "@core/repository";
import {
  ChannelWebhookContract,
  validateContract,
  type ChannelWebhookResult,
  type ConversationDoc,
  type InboundChannelMessage,
  type Message,
} from "@core/contracts";
import { createSupabaseServiceClient } from "@db/client";

// Paleta dos avatares gerados — a mesma família de tons usada nas fixtures do
// seed, para um lead novo não destoar dos que já lá estão.
const AVATAR_PALETTE = [
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#dcfce7", color: "#15803d" },
  { bg: "#fef9c3", color: "#a16207" },
  { bg: "#f3e8ff", color: "#7e22ce" },
] as const;

/**
 * Escrita das mensagens que chegam de um canal.
 *
 * Corre sem sessão nenhuma (um provider não traz cookies), por isso usa a chave
 * secreta — que **ignora o RLS**. Todas as queries daqui definem/filtram
 * `business_id` explicitamente, resolvido a partir da conversa ou do canal, e
 * nunca a partir do corpo do pedido: um `business_id` vindo de fora seria
 * exatamente o caminho para escrever nos dados de outro tenant.
 */
class ChannelWebhookService {
  private client() {
    return Promise.resolve(createSupabaseServiceClient());
  }

  private get conversations() {
    return new BaseRepository<ConversationDoc>({
      table: "conversations",
      client: () => this.client(),
    });
  }

  private get messages() {
    return new BaseRepository<Message>({ table: "messages", client: () => this.client() });
  }

  /**
   * `businessId` vai no retorno para a rota poder gerar a sugestão a seguir,
   * mas fica de fora de `ChannelWebhookResult` — que é o que o provider vê.
   */
  async receive(
    inbound: InboundChannelMessage,
  ): Promise<{ result: ChannelWebhookResult; businessId: string }> {
    const { conversationId, businessId } = await this.resolveConversation(inbound);

    const inserted = await this.insertMessage(conversationId, businessId, inbound);
    if (!inserted) {
      // Reentrega do provider. Nada a atualizar, nada a gerar — devolver
      // "duplicate" para o caller saber que não deve disparar a inferência.
      return {
        result: validateContract(
          ChannelWebhookContract.resultSchema,
          { status: "duplicate", conversation_id: conversationId },
          "ChannelWebhookService.receive",
        ),
        businessId,
      };
    }

    // Sem isto a conversa não sobe na lista nem mostra o badge de não-lida —
    // a ordenação da inbox é por last_message_at. É o espelho, para mensagens
    // recebidas, do que `sendMessage()` já faz para as enviadas.
    await this.conversations.update(conversationId, {
      last_message: inbound.text,
      last_message_at: inbound.timestamp,
      unread: true,
    } as Partial<ConversationDoc>);

    return {
      result: validateContract(
        ChannelWebhookContract.resultSchema,
        { status: "accepted", conversation_id: conversationId },
        "ChannelWebhookService.receive",
      ),
      businessId,
    };
  }

  /**
   * Conversa existente para este `channel_conversation_id`, ou uma nova (com o
   * contacto) se for a primeira vez que este cliente escreve.
   *
   * Devolve só a referência — id e tenant — e não um `ConversationDoc`. Esse
   * contrato exige `follow_ups`, que não é uma coluna: vive numa tabela à parte
   * e é juntado pelo serviço da lista. Validar a linha crua contra ele falharia
   * sempre, e o webhook não precisa de nada disso para escrever a mensagem.
   *
   * O `business_id` vem à parte porque `ConversationDoc` também não o modela —
   * a app normal nunca precisa dele, o RLS resolve-o. Aqui não há RLS.
   */
  private async resolveConversation(
    inbound: InboundChannelMessage,
  ): Promise<{ conversationId: string; businessId: string }> {
    const supabase = await this.client();
    const { data: existing, error } = await supabase
      .from("conversations")
      .select("id, business_id")
      .eq("channel_conversation_id", inbound.channel_conversation_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;

    if (existing) {
      // id é bigint (migração 004) — coagido para string, a forma opaca que o
      // resto da app assume.
      return {
        conversationId: String(existing.id),
        businessId: existing.business_id as string,
      };
    }

    const businessId = await this.resolveBusinessId();
    const palette = AVATAR_PALETTE[hash(inbound.contact.handle) % AVATAR_PALETTE.length];

    const created = await this.conversations.create<ConversationDoc>({
      business_id: businessId,
      channel_conversation_id: inbound.channel_conversation_id,
      contact: {
        id: inbound.contact.handle,
        name: inbound.contact.name,
        initials: initialsOf(inbound.contact.name),
        avatar_bg: palette.bg,
        avatar_color: palette.color,
        platform: inbound.channel,
        phone: inbound.contact.handle,
        first_contact: inbound.timestamp,
        status: "new",
      },
      last_message: inbound.text,
      last_message_at: inbound.timestamp,
      status: "open",
      unread: true,
      ai_scheduled: false,
      product_interest: null,
    } as Partial<ConversationDoc>);

    // `create()` devolve a linha crua da BD, onde o id é bigint — sem coagir,
    // seguia como número e a validação do resultado rebentava em cada lead novo.
    return { conversationId: String(created.id), businessId };
  }

  /**
   * A que negócio pertence esta mensagem.
   *
   * Enquanto a integração real de canais (T-010) não existir não há mapa de
   * conta-do-canal → business, por isso resolve-se para o único business
   * existente. Quando a T-010 chegar, isto passa a ser um lookup pela conta do
   * canal — e é o ponto exato onde um erro escreveria no tenant errado, já que
   * esta ligação não tem RLS a proteger.
   */
  private async resolveBusinessId(): Promise<string> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error("Nenhum business existe — corre `npm run seed` antes de usar o webhook.");
    }
    return data.id as string;
  }

  /**
   * Insere a mensagem, ou devolve `false` se já lá estava.
   *
   * A deteção de duplicado vem da constraint UNIQUE em `channel_message_id`
   * (migração 004): apanhar a violação 23505 é imune a corridas, ao contrário
   * de verificar-e-depois-inserir, e duas entregas simultâneas do provider são
   * precisamente uma corrida.
   */
  private async insertMessage(
    conversationId: string,
    businessId: string,
    inbound: InboundChannelMessage,
  ): Promise<boolean> {
    const supabase = await this.client();
    const { error } = await supabase.from("messages").insert({
      business_id: businessId,
      conversation_id: conversationId,
      channel_message_id: inbound.channel_message_id,
      content: inbound.text,
      direction: "in",
      timestamp: inbound.timestamp.toISOString(),
      read: false,
    });

    if (!error) {
      return true;
    }
    if (error.code === "23505") {
      return false;
    }
    throw error;
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0];
  return (letters ?? "?").toUpperCase();
}

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result * 31 + value.charCodeAt(i)) >>> 0;
  }
  return result;
}

export const channelWebhookService = new ChannelWebhookService();
