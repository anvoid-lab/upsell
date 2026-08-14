"use client";

import { useState, useEffect } from "react";
import type { Conversation, AISuggestion, Message } from "@/types";
import type { FollowUpType } from "@core/contracts";
import {
  fetchConversationAction,
  fetchAISuggestionAction,
  sendMessageAction,
  scheduleFollowUpAction,
  markAsResolvedAction,
} from "./actions";

interface UseChatPanelReturn {
  conversation: Conversation | null;
  messages: Message[];
  suggestion: AISuggestion | null;
  replyText: string;
  isLoading: boolean;
  isSending: boolean;
  suggestionStatus: "idle" | "sending" | "scheduled" | "dismissed";
  setReplyText: (text: string) => void;
  handleSendReply: () => Promise<void>;
  handleSendSuggestion: (overrideText?: string) => Promise<void>;
  handleScheduleSuggestion: (hours: number) => Promise<void>;
  handleDismissSuggestion: () => void;
}

export function useChatPanel(selectedId: string | null): UseChatPanelReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState<
    "idle" | "sending" | "scheduled" | "dismissed"
  >("idle");

  useEffect(() => {
    if (!selectedId) {
      setConversation(null);
      setMessages([]);
      setSuggestion(null);
      return;
    }
    setIsLoading(true);
    setSuggestionStatus("idle");

    Promise.all([
      fetchConversationAction(selectedId),
      fetchAISuggestionAction(selectedId),
    ]).then(([conv, sug]) => {
      setConversation(conv);
      setMessages(conv?.messages ?? []);
      setSuggestion(sug);
      setIsLoading(false);
    });
  }, [selectedId]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setIsSending(true);
    await sendMessageAction(selectedId, replyText);
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: selectedId,
      content: replyText,
      direction: "out",
      timestamp: new Date(),
      read: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setReplyText("");
    setIsSending(false);
  };

  const handleSendSuggestion = async (overrideText?: string) => {
    const text = overrideText ?? suggestion?.message;
    if (!text || !selectedId) return;
    setSuggestionStatus("sending");
    await sendMessageAction(selectedId, text);
    const newMsg: Message = {
      id: `msg-ai-${Date.now()}`,
      conversation_id: selectedId,
      content: text,
      direction: "out",
      timestamp: new Date(),
      sent_by_ai: !overrideText,
      read: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setSuggestionStatus("dismissed");
  };

  const handleScheduleSuggestion = async (hours: number) => {
    if (!suggestion || !selectedId) return;
    setSuggestionStatus("sending");
    await scheduleFollowUpAction(selectedId, suggestion.message, hours, suggestion.type as FollowUpType);
    setSuggestionStatus("scheduled");
  };

  const handleDismissSuggestion = () => setSuggestionStatus("dismissed");

  return {
    conversation,
    messages,
    suggestion,
    replyText,
    isLoading,
    isSending,
    suggestionStatus,
    setReplyText,
    handleSendReply,
    handleSendSuggestion,
    handleScheduleSuggestion,
    handleDismissSuggestion,
  };
}
