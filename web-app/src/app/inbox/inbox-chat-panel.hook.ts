"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Conversation, Message } from "@/types";
import {
  fetchConversationAction,
  markAsReadAction,
  retryMessageAction,
  sendMessageAction,
} from "./actions";

export interface UseChatPanelReturn {
  conversation: Conversation | null;
  messages: Message[];
  replyText: string;
  isLoading: boolean;
  isSending: boolean;
  retryingMessageIds: Set<string>;
  setReplyText: (text: string) => void;
  handleSendReply: () => Promise<void>;
  handleRetryMessage: (messageId: string) => Promise<void>;
  applyRealtimeMessage: (message: Message) => void;
}

export function useChatPanel(selectedId: string | null): UseChatPanelReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [retryingMessageIds, setRetryingMessageIds] = useState<Set<string>>(new Set());
  const sendingRef = useRef(false);
  const retryingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setConversation(null);
    setMessages([]);
    setReplyText("");
    setRetryingMessageIds(new Set());
    sendingRef.current = false;
    retryingRef.current.clear();
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

  const upsertMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      const index = prev.findIndex((current) =>
        current.id === message.id ||
        Boolean(
          current.client_message_id &&
          message.client_message_id &&
          current.client_message_id === message.client_message_id,
        ) ||
        Boolean(
          current.channel_message_id &&
          message.channel_message_id &&
          current.channel_message_id === message.channel_message_id,
        ));
      if (index === -1) return [...prev, message];
      const next = [...prev];
      next[index] = message;
      return next;
    });
  }, []);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedId || sendingRef.current) return;
    const content = replyText.trim();
    const clientMessageId = crypto.randomUUID();
    const optimistic: Message = {
      id: `pending:${clientMessageId}`,
      conversation_id: selectedId,
      content,
      direction: "out",
      timestamp: new Date(),
      read: false,
      client_message_id: clientMessageId,
      delivery_status: "pending",
      delivery_error: null,
      delivery_updated_at: new Date(),
      channel_id: null,
      channel_message_id: null,
    };
    sendingRef.current = true;
    setIsSending(true);
    setReplyText("");
    upsertMessage(optimistic);
    try {
      const sent = await sendMessageAction(selectedId, content, clientMessageId);
      upsertMessage(sent);
      if (sent.delivery_status === "failed") {
        setReplyText((current) => current || content);
      }
    } catch {
      upsertMessage({
        ...optimistic,
        delivery_status: "failed",
        delivery_error: "Message could not be sent. Check the connection and try again.",
        delivery_updated_at: new Date(),
      });
      setReplyText((current) => current || content);
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleRetryMessage = useCallback(async (messageId: string) => {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message || retryingRef.current.has(messageId)) return;

    retryingRef.current.add(messageId);
    setRetryingMessageIds((current) => new Set(current).add(messageId));
    upsertMessage({
      ...message,
      delivery_status: "pending",
      delivery_error: null,
      delivery_updated_at: new Date(),
    });
    try {
      const retried = message.id.startsWith("pending:") && message.client_message_id
        ? await sendMessageAction(message.conversation_id, message.content, message.client_message_id)
        : await retryMessageAction(message.id);
      upsertMessage(retried);
    } catch {
      upsertMessage({
        ...message,
        delivery_status: "failed",
        delivery_error: message.delivery_error || "Retry failed. Check the connection and try again.",
        delivery_updated_at: new Date(),
      });
    } finally {
      retryingRef.current.delete(messageId);
      setRetryingMessageIds((current) => {
        const next = new Set(current);
        next.delete(messageId);
        return next;
      });
    }
  }, [messages, upsertMessage]);

  const applyRealtimeMessage = useCallback((message: Message) => {
    if (message.conversation_id === selectedId) upsertMessage(message);
  }, [selectedId, upsertMessage]);

  return { conversation, messages, replyText, isLoading, isSending, retryingMessageIds,
    setReplyText, handleSendReply, handleRetryMessage, applyRealtimeMessage };
}
