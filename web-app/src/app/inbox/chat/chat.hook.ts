"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Conversation, ConversationNote, Message, MessageAttachmentType } from "@/types";
import {
  addConversationNoteAction,
  fetchConversationAction,
  markAsReadAction,
  retryMessageAction,
  sendMessageAction,
} from "../inbox.service";
import { UseChatPanelReturn, SelectedAttachment } from "./chat.types";


function fileType(file: File): MessageAttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function useChatPanel(selectedId: string | null): UseChatPanelReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [retryingMessageIds, setRetryingMessageIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<SelectedAttachment[]>([]);
  const sendingRef = useRef(false);
  const retryingRef = useRef<Set<string>>(new Set());
  const addingNoteRef = useRef(false);
  const retryFilesRef = useRef(new Map<string, File[]>());
  const selectedAttachmentsRef = useRef<SelectedAttachment[]>([]);

  useEffect(() => {
    selectedAttachmentsRef.current = selectedAttachments;
  }, [selectedAttachments]);

  useEffect(() => () => {
    for (const item of selectedAttachmentsRef.current) URL.revokeObjectURL(item.previewUrl);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setConversation(null);
    setMessages([]);
    setReplyText("");
    setNotes([]);
    setRetryingMessageIds(new Set());
    setSelectedAttachments((current) => {
      for (const item of current) URL.revokeObjectURL(item.previewUrl);
      return [];
    });
    retryFilesRef.current.clear();
    sendingRef.current = false;
    retryingRef.current.clear();
    addingNoteRef.current = false;
    setIsLoading(Boolean(selectedId));
    if (!selectedId) return;
    fetchConversationAction(selectedId)
      .then((conv) => {
        if (cancelled) return;
        setConversation(conv);
        setMessages(conv?.messages ?? []);
        setNotes(conv?.notes ?? []);
      })
      .catch(() => { /* Leave the empty panel available if loading fails. */ })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    markAsReadAction(selectedId).catch(() => { });
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
      const previous = prev[index];
      const shouldKeepLocalUrls =
        message.attachment.length > 0 &&
        message.attachment.every((item) => !item.media_url) &&
        previous.attachment.length === message.attachment.length;
      next[index] = shouldKeepLocalUrls
        ? {
          ...message,
          attachment: message.attachment.map((item, attachmentIndex) => ({
            ...item,
            media_url: previous.attachment[attachmentIndex]?.media_url ?? null,
          })),
        }
        : message;
      if (message.channel_message_id && !shouldKeepLocalUrls) {
        for (const attachment of previous.attachment) {
          if (attachment.media_url?.startsWith("blob:")) {
            URL.revokeObjectURL(attachment.media_url);
          }
        }
        if (message.client_message_id) retryFilesRef.current.delete(message.client_message_id);
      }
      return next;
    });
  }, []);

  const addAttachments = useCallback((files: FileList | File[]) => {
    const additions = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      type: fileType(file),
    }));
    setSelectedAttachments((current) => [...current, ...additions]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setSelectedAttachments((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const handleSendReply = async () => {
    if ((!replyText.trim() && selectedAttachments.length === 0) || !selectedId || sendingRef.current) return;
    const content = replyText.trim();
    const clientMessageId = crypto.randomUUID();
    const outgoingAttachments = [...selectedAttachments];
    const optimistic: Message = {
      id: `pending:${clientMessageId}`,
      conversation_id: selectedId,
      content,
      attachment: outgoingAttachments.map((item) => ({
        external_id: null,
        media_url: item.previewUrl,
        type: item.type,
        mime_type: item.file.type || null,
        filename: item.file.name,
        size_bytes: item.file.size,
        width: null,
        height: null,
        unavailable: false,
        metadata: {},
      })),
      direction: "out",
      timestamp: new Date(),
      read: false,
      client_message_id: clientMessageId,
      delivery_status: "pending",
      delivery_error: null,
      delivery_updated_at: new Date(),
      channel_id: null,
      channel_message_id: null,
      hidden: false,
      reactions: [],
      provider_metadata: {},
    };
    sendingRef.current = true;
    setIsSending(true);
    setReplyText("");
    setSelectedAttachments([]);
    retryFilesRef.current.set(clientMessageId, outgoingAttachments.map((item) => item.file));
    upsertMessage(optimistic);
    try {
      const formData = createMessageFormData(selectedId, content, clientMessageId, outgoingAttachments.map((item) => item.file));
      const sent = await sendMessageAction(formData);
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
      const retryFiles = message.client_message_id
        ? retryFilesRef.current.get(message.client_message_id)
        : undefined;
      const retried = message.client_message_id && retryFiles
        ? await sendMessageAction(createMessageFormData(
          message.conversation_id,
          message.content,
          message.client_message_id,
          retryFiles,
        ))
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

  const handleAddNote = useCallback(async (content: string): Promise<boolean> => {
    const trimmed = content.trim();
    if (!trimmed || !selectedId || addingNoteRef.current) return false;

    const optimisticId = `pending-note:${crypto.randomUUID()}`;
    const optimistic: ConversationNote = {
      id: optimisticId,
      conversation_id: selectedId,
      author_id: "00000000-0000-4000-8000-000000000000",
      content: trimmed,
      created_at: new Date(),
    };
    addingNoteRef.current = true;
    setIsAddingNote(true);
    setNotes((current) => [optimistic, ...current]);
    try {
      const created = await addConversationNoteAction(selectedId, trimmed);
      setNotes((current) => current.map((note) => note.id === optimisticId ? created : note));
      return true;
    } catch {
      setNotes((current) => current.filter((note) => note.id !== optimisticId));
      return false;
    } finally {
      addingNoteRef.current = false;
      setIsAddingNote(false);
    }
  }, [selectedId]);

  return {
    conversation, messages, notes, replyText, isLoading, isSending, isAddingNote,
    retryingMessageIds, selectedAttachments, setReplyText, addAttachments, removeAttachment,
    handleSendReply, handleRetryMessage,
    handleAddNote, applyRealtimeMessage
  };
}

function createMessageFormData(
  conversationId: string,
  content: string,
  clientMessageId: string,
  attachments: File[],
) {
  const formData = new FormData();
  formData.set("conversation_id", conversationId);
  formData.set("content", content);
  formData.set("client_message_id", clientMessageId);
  for (const file of attachments) formData.append("attachments", file, file.name);
  return formData;
}
