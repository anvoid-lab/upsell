"use client";

import { useEffect, useRef } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

import { createSupabaseBrowserClient, ensureRealtimeAuth } from "@db/browser-client";
import { ConversationContract, MessageContract, AISuggestionContract } from "@core/contracts";
import type { AISuggestion, ConversationRealtimeRow, Message } from "@core/contracts";

type Handlers = {
  onMessage?: (message: Message) => void;
  onConversationChange?: (conversation: ConversationRealtimeRow) => void;
  onSuggestion?: (suggestion: AISuggestion) => void;
};

/**
 * Subscrição Realtime da inbox.
 *
 * Sem filtro por conversa de propósito: as políticas `*_tenant` (migração 003)
 * aplicam-se também aos eventos do Postgres Changes, por isso uma subscrição
 * sem filtro entrega exatamente as linhas deste business — o RLS é, aqui, a
 * autorização do socket. Filtrar por `conversation_id` daria só a conversa
 * aberta e a lista deixaria de saber das outras.
 *
 * Os handlers passam por `useRef` para que trocar de conversa não desfaça e
 * refaça a ligação WebSocket a cada render.
 */
export function useRealtimeInbox(handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Sem isto o socket liga na mesma e devolve SUBSCRIBED — só que
    // autenticado como anon, e o RLS filtra tudo em silêncio. Ver o porquê
    // em ensureRealtimeAuth().
    ensureRealtimeAuth(supabase).then(() => {
      if (cancelled) return;

      channel = supabase
        .channel("inbox")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
            const parsed = MessageContract.entitySchema.safeParse(payload.new);
            if (parsed.success) {
              handlersRef.current.onMessage?.(parsed.data);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          (payload) => {
            const parsed = ConversationContract.realtimeRowSchema.safeParse(payload.new);
            if (parsed.success) {
              handlersRef.current.onConversationChange?.(parsed.data);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "ai_suggestions" },
          (payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
            const parsed = AISuggestionContract.entitySchema.safeParse(payload.new);
            if (parsed.success) {
              handlersRef.current.onSuggestion?.(parsed.data);
            }
          },
        )
        .subscribe((status, error) => {
          // Uma subscrição que não liga falha em silêncio: a inbox continua a
          // renderizar, só deixa de se atualizar. Sem isto, a diferença entre
          // "não há mensagens novas" e "o socket nunca ligou" é invisível.
          if (status === "SUBSCRIBED") {
            return;
          }
          console.warn(
            `[realtime] inbox channel: ${status}` +
              (status === "CHANNEL_ERROR"
                ? " — confirma que a migração 007 foi aplicada (publication supabase_realtime)"
                : ""),
            error ?? "",
          );
        });
    });

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);
}
