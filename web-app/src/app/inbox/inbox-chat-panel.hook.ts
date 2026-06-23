"use client";

import { useState, useEffect } from "react";
import type { Conversation, AISuggestion, Message } from "@/types";
import { inboxConversationListService } from "./inbox-conversation-list.service";
import { inboxChatPanelService } from "./inbox-chat-panel.service";

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
      inboxConversationListService.fetchConversationById(selectedId),
      inboxChatPanelService.fetchAISuggestion(selectedId),
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
    await inboxChatPanelService.sendMessage(selectedId, replyText);
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: selectedId,
      content: replyText,
      direction: "out",
      timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
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
    await inboxChatPanelService.sendMessage(selectedId, text);
    const newMsg: Message = {
      id: `msg-ai-${Date.now()}`,
      conversationId: selectedId,
      content: text,
      direction: "out",
      timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      sentByAI: !overrideText,
      read: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setSuggestionStatus("dismissed");
  };

  const handleScheduleSuggestion = async (hours: number) => {
    if (!suggestion || !selectedId) return;
    setSuggestionStatus("sending");
    await inboxChatPanelService.scheduleFollowUp(selectedId, suggestion.message, hours, suggestion.type);
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
