"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Conversation, AISuggestion, Message } from "@/types";
import type { FollowUpType } from "@core/contracts";
import {
  fetchConversationAction,
  fetchAISuggestionAction,
  markAsReadAction,
  touchConversationViewAction,
  sendMessageAction,
  scheduleFollowUpAction,
  markAsResolvedAction,
} from "./actions";

// Comfortably under the freshness window the drain endpoint uses (60s), so a
// single missed beat doesn't stop the seller counting as present.
const PRESENCE_HEARTBEAT_MS = 20_000;

// How long to wait for a suggestion the webhook queued before giving up on the
// indicator.
//
// Generation is no longer synchronous with the message (T-028): there's the
// debounce delay (12s) plus the drain cadence (10s), and the presence gate may
// decide not to generate at all. Without a bound, the indicator would pulse
// forever waiting for something that may never arrive — which is exactly what
// the infinite-skeleton bug was. Giving up re-enables the icon so the seller
// can ask for the suggestion by hand.
const SUGGESTION_WAIT_TIMEOUT_MS = 45_000;

export interface UseChatPanelReturn {
  conversation: Conversation | null;
  messages: Message[];
  suggestion: AISuggestion | null;
  replyText: string;
  isLoading: boolean;
  isSuggestionLoading: boolean;
  isSending: boolean;
  suggestionStatus: "idle" | "sending" | "scheduled" | "dismissed";
  setReplyText: (text: string) => void;
  handleSendReply: () => Promise<void>;
  handleSendSuggestion: (overrideText?: string) => Promise<void>;
  handleScheduleSuggestion: (hours: number) => Promise<void>;
  handleDismissSuggestion: () => void;
  handleGenerateSuggestion: () => Promise<void>;
  /** Entradas do Realtime — chamadas pelo InboxView, que detém a subscrição. */
  applyRealtimeMessage: (message: Message) => void;
  applyRealtimeSuggestion: (suggestion: AISuggestion) => void;
}

export function useChatPanel(selectedId: string | null): UseChatPanelReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState<
    "idle" | "sending" | "scheduled" | "dismissed"
  >("idle");

  const suggestionWaitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWaitingForSuggestion = useCallback(() => {
    if (suggestionWaitRef.current) {
      clearTimeout(suggestionWaitRef.current);
      suggestionWaitRef.current = null;
    }
  }, []);

  /**
   * Enter the "generating" state: clear the suggestion currently on screen (it
   * no longer answers the latest message) and turn the indicator on, with a
   * deadline to give up.
   */
  const startWaitingForSuggestion = useCallback(() => {
    stopWaitingForSuggestion();
    setSuggestion(null);
    setSuggestionStatus("idle");
    setIsSuggestionLoading(true);
    suggestionWaitRef.current = setTimeout(() => {
      suggestionWaitRef.current = null;
      setIsSuggestionLoading(false);
    }, SUGGESTION_WAIT_TIMEOUT_MS);
  }, [stopWaitingForSuggestion]);

  useEffect(() => {
    if (!selectedId) {
      setConversation(null);
      setMessages([]);
      setSuggestion(null);
      setIsSuggestionLoading(false);
      return;
    }
    setIsLoading(true);
    setIsSuggestionLoading(true);
    setSuggestionStatus("idle");
    setSuggestion(null);

    // Fetched separately on purpose: a failed AI generation must not stop the
    // conversation from loading. fetchAISuggestionAction() already returns null
    // rather than rejecting on error (see the service), but the catch stays
    // here too — nothing guarantees that promise never rejects.
    //
    // This path reuses an existing suggestion whenever one was already
    // generated for the latest customer message, so simply opening a
    // conversation does not spend an LLM call.
    fetchConversationAction(selectedId).then((conv) => {
      setConversation(conv);
      setMessages(conv?.messages ?? []);
      setIsLoading(false);
    });

    fetchAISuggestionAction(selectedId)
      .then(setSuggestion)
      .catch(() => setSuggestion(null))
      .finally(() => setIsSuggestionLoading(false));

    // Opening the conversation is what marks it read; without this the badge
    // would lie, now that `unread` actually changes (channel webhook).
    markAsReadAction(selectedId).catch(() => {
      // Not worth breaking the conversation over a badge.
    });

    // Presence heartbeat (migration 008) — this is what tells the drain
    // endpoint that generating is worth it rather than saving the call. Beat
    // immediately (not only after 20s) so the first drain window isn't missed
    // when the seller opens a conversation just as a message lands.
    const touchPresence = () => {
      if (document.visibilityState !== "visible") return;
      touchConversationViewAction(selectedId).catch(() => {
        // A missed beat is harmless — the freshness window tolerates it.
      });
    };
    touchPresence();
    const heartbeat = setInterval(touchPresence, PRESENCE_HEARTBEAT_MS);
    return () => {
      clearInterval(heartbeat);
      // Switching conversations abandons any pending wait — the deadline
      // belongs to the conversation that was open, not the next one.
      stopWaitingForSuggestion();
    };
  }, [selectedId, stopWaitingForSuggestion]);

  // Appends without duplicating. Both the message the seller just sent and the
  // copy Realtime echoes back go through here: with the real database id on
  // both, the second is recognised and ignored.
  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }, []);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setIsSending(true);
    const sent = await sendMessageAction(selectedId, replyText);
    appendMessage(sent);
    setReplyText("");
    setIsSending(false);
  };

  const handleSendSuggestion = async (overrideText?: string) => {
    const text = overrideText ?? suggestion?.message;
    if (!text || !selectedId) return;
    setSuggestionStatus("sending");
    const sent = await sendMessageAction(selectedId, text);
    appendMessage({ ...sent, sent_by_ai: !overrideText });
    setSuggestionStatus("dismissed");
  };

  const handleScheduleSuggestion = async (hours: number) => {
    if (!suggestion || !selectedId) return;
    setSuggestionStatus("sending");
    await scheduleFollowUpAction(selectedId, suggestion.message, hours, suggestion.type as FollowUpType);
    setSuggestionStatus("scheduled");
  };

  const handleDismissSuggestion = () => setSuggestionStatus("dismissed");

  // The only path besides a new customer message that generates another
  // suggestion — the seller explicitly asked for one.
  const handleGenerateSuggestion = async () => {
    if (!selectedId) return;
    // Unlike the Realtime path, this awaits the generation directly, so it
    // always resolves — no deadline needed, just clear any pending one.
    stopWaitingForSuggestion();
    setSuggestion(null);
    setSuggestionStatus("idle");
    setIsSuggestionLoading(true);
    try {
      const result = await fetchAISuggestionAction(selectedId, { force: true });
      setSuggestion(result);
    } catch {
      setSuggestion(null);
    } finally {
      setIsSuggestionLoading(false);
    }
  };

  // A subscrição não filtra por conversa (o RLS já a limita ao tenant), por
  // isso chegam aqui mensagens de conversas que não estão abertas — essas
  // interessam à lista, não ao painel.
  const applyRealtimeMessage = useCallback(
    (message: Message) => {
      if (message.conversation_id !== selectedId) return;
      appendMessage(message);
      if (message.direction === "in") {
        // The customer replied, so the suggestion on screen is stale. The
        // webhook has queued a new one; wait for it to arrive over Realtime,
        // but not indefinitely — it may be debounced, or skipped entirely.
        startWaitingForSuggestion();
      }
    },
    [selectedId, appendMessage, startWaitingForSuggestion],
  );

  const applyRealtimeSuggestion = useCallback(
    (incoming: AISuggestion) => {
      if (incoming.conversation_id !== selectedId) return;
      stopWaitingForSuggestion();
      setSuggestion(incoming);
      setIsSuggestionLoading(false);
      setSuggestionStatus("idle");
    },
    [selectedId, stopWaitingForSuggestion],
  );

  return {
    conversation,
    messages,
    suggestion,
    replyText,
    isLoading,
    isSuggestionLoading,
    isSending,
    suggestionStatus,
    setReplyText,
    handleSendReply,
    handleSendSuggestion,
    handleScheduleSuggestion,
    handleDismissSuggestion,
    handleGenerateSuggestion,
    applyRealtimeMessage,
    applyRealtimeSuggestion,
  };
}
