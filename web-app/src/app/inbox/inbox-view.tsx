'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  Conversation,
  ConversationRealtimeRow,
  ConversationStatus,
} from '@/types';
import { InboxConversationList } from './inbox-conversation-list';
import { InboxChatPanel } from './inbox-chat-panel';
import { InboxDetailsPanel } from './inbox-details-panel';
import { useChatPanel } from './inbox-chat-panel.hook';
import { useRealtimeInbox } from './use-realtime-inbox.hook';
import { IntegrationView } from '@/app/inbox/integration/integration-view';
import { updateConversationStatusAction } from './actions';

interface InboxViewProps {
  initialConversations: Conversation[];
}

const SELECTED_PARAM = 'c';

export function InboxView({ initialConversations }: InboxViewProps) {
  const [integrating, setIntegrating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Keep the selection in the URL so it survives a full page refresh.
  const selectedId = searchParams.get(SELECTED_PARAM);

  const setSelectedId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set(SELECTED_PARAM, id);
      } else {
        params.delete(SELECTED_PARAM);
      }
      // Replace the current entry so the Back button leaves the inbox instead
      // of traversing every previously selected conversation.
      router.replace(`${pathname}${params.size ? `?${params}` : ''}`, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, ConversationStatus>
  >({});

  // Keep the list beside the Realtime subscription so the conversation panel
  // and list react to the same events.
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);

  const chatPanel = useChatPanel(selectedId);
  const { applyRealtimeMessage } = chatPanel;

  const handleConversationChange = useCallback(
    (incoming: ConversationRealtimeRow) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === incoming.id);
        if (index === -1) {
          // A new conversation receives its messages and follow-ups when opened
          // or through Realtime if it is already selected.
          return [{ ...incoming, messages: [], follow_ups: [], notes: [] }, ...prev];
        }
        const next = [...prev];
        // Preserve related data that is not included in the Realtime row.
        next[index] = {
          ...incoming,
          messages: prev[index].messages,
          follow_ups: prev[index].follow_ups,
          notes: prev[index].notes,
        };
        return next;
      });
    },
    [],
  );

  useRealtimeInbox({
    onMessage: applyRealtimeMessage,
    onConversationChange: handleConversationChange,
  });

  const handleStatusChange = async (
    id: string,
    status: ConversationStatus,
  ): Promise<boolean> => {
    const previousStatus =
      statusOverrides[id] ?? conversations.find((conversation) => conversation.id === id)?.status;
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
    try {
      const persistedStatus = await updateConversationStatusAction(id, status);
      setConversations((current) => current.map((conversation) =>
        conversation.id === id ? { ...conversation, status: persistedStatus } : conversation,
      ));
      setStatusOverrides((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return true;
    } catch {
      setStatusOverrides((current) => {
        const next = { ...current };
        if (previousStatus) next[id] = previousStatus;
        else delete next[id];
        return next;
      });
      return false;
    }
  };

  const handleClose = () => {
    setSelectedId(null);
  };

  return (
    <>
      {integrating && <IntegrationView onClose={() => setIntegrating(false)} />}
      <InboxConversationList
        onConnect={() => setIntegrating(true)}
        selectedId={selectedId}
        onSelect={setSelectedId}
        statusOverrides={statusOverrides}
        conversations={conversations}
      />
      <InboxChatPanel
        selectedId={selectedId}
        chatPanel={chatPanel}
        onStatusChange={handleStatusChange}
        onClose={handleClose}
      />
      <InboxDetailsPanel
        conversation={chatPanel.conversation}
        notes={chatPanel.notes}
        isAddingNote={chatPanel.isAddingNote}
        onAddNote={chatPanel.handleAddNote}
      />
    </>
  );
}
