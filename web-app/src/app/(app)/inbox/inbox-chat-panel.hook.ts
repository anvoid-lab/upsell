"use client";

import { useState, useEffect, useCallback } from "react";
import type { Conversation, Message } from "@/types";
import { fetchConversationAction, markAsReadAction, sendMessageAction } from "./actions";

export interface UseChatPanelReturn {
  conversation: Conversation | null;
  messages: Message[];
  replyText: string;
  isLoading: boolean;
  isSending: boolean;
  setReplyText: (text: string) => void;
  handleSendReply: () => Promise<void>;
  applyRealtimeMessage: (message: Message) => void;
}

export function useChatPanel(selectedId: string | null): UseChatPanelReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setConversation(null);
    setMessages([]);
    setReplyText("");
    setIsLoading(Boolean(selectedId));
    if (!selectedId) return;
    fetchConversationAction(selectedId)
      .then((conv) => {
        if (cancelled) return;
        setConversation(conv);
        setMessages(conv?.messages ?? []);
      })
      .catch(() => { /* Leave the empty panel available if loading fails. */ })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    markAsReadAction(selectedId).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedId]);

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev, message]);
  }, []);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setIsSending(true);
    try {
      const sent = await sendMessageAction(selectedId, replyText);
      appendMessage(sent);
      setReplyText("");
    } finally {
      setIsSending(false);
    }
  };

  const applyRealtimeMessage = useCallback((message: Message) => {
    if (message.conversation_id === selectedId) appendMessage(message);
  }, [selectedId, appendMessage]);

  return { conversation, messages, replyText, isLoading, isSending,
    setReplyText, handleSendReply, applyRealtimeMessage };
}
