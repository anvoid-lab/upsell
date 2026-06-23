"use client";

import { useState } from "react";
import type { Conversation, ConversationStatus } from "@/types";
import { InboxConversationList } from "./inbox-conversation-list";
import { InboxChatPanel } from "./inbox-chat-panel";
import { InboxDetailsPanel } from "./inbox-details-panel";
import { useChatPanel } from "./inbox-chat-panel.hook";

interface InboxViewProps {
  initialConversations: Conversation[];
}

export function InboxView({ initialConversations }: InboxViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>("c1");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ConversationStatus>>({});
  const { conversation } = useChatPanel(selectedId);

  const handleStatusChange = (id: string, status: ConversationStatus) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
  };

  const handleClose = () => {
    if (selectedId) handleStatusChange(selectedId, "resolved");
    setSelectedId(null);
  };

  return (
    <>
      <InboxConversationList
        selectedId={selectedId}
        onSelect={setSelectedId}
        statusOverrides={statusOverrides}
        initialConversations={initialConversations}
      />
      <InboxChatPanel selectedId={selectedId} onStatusChange={handleStatusChange} onClose={handleClose} />
      <InboxDetailsPanel conversation={conversation} />
    </>
  );
}
