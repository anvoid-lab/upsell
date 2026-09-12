'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  IconAlertCircle,
  IconBrandInstagram,
  IconLoader2,
  IconMessageCircle,
  IconRefresh,
} from '@icons';
import type {
  Conversation,
  ConversationRealtimeRow,
  ConversationStatus,
  ChannelConnection,
} from '@/types';
import { InboxConversationList } from './inbox-conversation-list';
import { InboxChatPanel } from './inbox-chat-panel';
import { InboxDetailsPanel } from './inbox-details-panel';
import { useChatPanel } from './inbox-chat-panel.hook';
import { useRealtimeInbox } from './use-realtime-inbox.hook';
import { IntegrationView } from '@/app/inbox/integration/integration-view';
import { InboxOnboarding } from './inbox-onboarding';
import { updateConversationStatusAction } from './actions';
import { integrationStatusAction } from './integration/actions';
import {
  connectionNeedsAttention,
  resolveInboxConnectionStatus,
  resolveInboxEmptyState,
  type InboxEmptyState as InboxEmptyStateName,
} from './inbox-state';
import { Button } from '@/components/ui/button';

interface InboxViewProps {
  initialConversations: Conversation[];
  initialChannels: ChannelConnection[];
  initialLoadFailed: boolean;
}

const SELECTED_PARAM = 'c';

export function InboxView({
  initialConversations,
  initialChannels,
  initialLoadFailed,
}: InboxViewProps) {
  const [integrating, setIntegrating] = useState<ChannelConnection | null>(
    null,
  );
  const [channels, setChannels] = useState(initialChannels);
  const connectionStatus = resolveInboxConnectionStatus(channels);
  const [loadFailed, setLoadFailed] = useState(initialLoadFailed);
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

  useEffect(() => {
    setConversations(initialConversations);
    setChannels(initialChannels);
    setLoadFailed(initialLoadFailed);
  }, [initialConversations, initialChannels, initialLoadFailed]);

  useEffect(() => {
    if (connectionStatus !== 'connecting' && connectionStatus !== 'syncing')
      return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const activeChannel = channels.find(
          (channel) =>
            channel.connection_status === 'connecting' ||
            channel.connection_status === 'syncing',
        );
        if (!activeChannel) return;
        const current = await integrationStatusAction(activeChannel.platform);
        if (cancelled) return;
        setChannels((existing) =>
          existing.map((channel) =>
            channel.platform === activeChannel.platform
              ? {
                  ...channel,
                  connected: current === 'connected',
                  connection_status: current,
                }
              : channel,
          ),
        );
        if (current === 'connecting' || current === 'syncing') {
          timer = setTimeout(poll, 2500);
        } else {
          router.refresh();
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    };
    timer = setTimeout(poll, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [channels, connectionStatus, router]);

  const chatPanel = useChatPanel(selectedId);
  const { applyRealtimeMessage } = chatPanel;

  const handleConversationChange = useCallback(
    (incoming: ConversationRealtimeRow) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === incoming.id);
        if (index === -1) {
          // A new conversation receives its messages and follow-ups when opened
          // or through Realtime if it is already selected.
          return [
            { ...incoming, messages: [], follow_ups: [], notes: [] },
            ...prev,
          ];
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
      statusOverrides[id] ??
      conversations.find((conversation) => conversation.id === id)?.status;
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
    try {
      const persistedStatus = await updateConversationStatusAction(id, status);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === id
            ? { ...conversation, status: persistedStatus }
            : conversation,
        ),
      );
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

  const emptyState = resolveInboxEmptyState(
    connectionStatus,
    conversations.length,
    loadFailed,
  );
  const showConnectionWarning =
    emptyState === 'inbox' && connectionNeedsAttention(connectionStatus);

  if (emptyState === 'connect') {
    return <InboxOnboarding channels={channels} />;
  }

  return (
    <div className="flex justify-between w-full">
      {integrating && (
        <IntegrationView
          channel={integrating.platform as 'whatsapp' | 'instagram'}
          onClose={() => setIntegrating(null)}
        />
      )}
      <InboxConversationList
        onConnect={() => {
          const channel =
            channels.find((item) =>
              connectionNeedsAttention(
                item.connection_status ?? 'disconnected',
              ),
            ) ?? channels[0];
          if (channel) setIntegrating(channel);
        }}
        selectedId={selectedId}
        onSelect={setSelectedId}
        statusOverrides={statusOverrides}
        conversations={conversations}
      />
      {emptyState === 'inbox' ? (
        <div className="flex flex-1 ">
          {showConnectionWarning && (
            <ConnectionWarning
              onReconnect={() => {
                const channel = channels.find((item) =>
                  connectionNeedsAttention(
                    item.connection_status ?? 'disconnected',
                  ),
                );
                if (channel) setIntegrating(channel);
              }}
            />
          )}
          <div className="flex flex-grow w-full">
            <InboxChatPanel
              selectedId={selectedId}
              chatPanel={chatPanel}
              onStatusChange={handleStatusChange}
              onClose={handleClose}
            />
          </div>

          <div className="flex w-[45%]">
            <InboxDetailsPanel
              conversation={chatPanel.conversation}
              notes={chatPanel.notes}
              isAddingNote={chatPanel.isAddingNote}
              onAddNote={chatPanel.handleAddNote}
            />
          </div>
        </div>
      ) : (
        <InboxEmptyState
          state={emptyState}
          onConnect={() => {
            const channel =
              channels.find((item) =>
                connectionNeedsAttention(
                  item.connection_status ?? 'disconnected',
                ),
              ) ?? channels[0];
            if (channel) setIntegrating(channel);
          }}
          onRetry={() => router.refresh()}
        />
      )}
    </div>
  );
}

function InboxEmptyState({
  state,
  onConnect,
  onRetry,
}: {
  state: Exclude<InboxEmptyStateName, 'inbox'>;
  onConnect: () => void;
  onRetry: () => void;
}) {
  const content = {
    connect: {
      Icon: IconBrandInstagram,
      title: 'Connect Instagram',
      description:
        'Connect your account to receive and reply to customer messages.',
    },
    connecting: {
      Icon: IconLoader2,
      title: 'Connecting Instagram',
      description:
        'Your account is being connected and synchronized. This updates automatically.',
    },
    waiting: {
      Icon: IconMessageCircle,
      title: 'Waiting for the first message',
      description:
        'Instagram is connected. New customer messages will appear here automatically.',
    },
    reconnect: {
      Icon: IconRefresh,
      title: 'Reconnect Instagram',
      description:
        'The connection needs attention before you can send or receive new messages.',
    },
    error: {
      Icon: IconAlertCircle,
      title: 'Inbox could not be loaded',
      description:
        'We could not check your conversations or Instagram connection.',
    },
  }[state];
  const Icon = content.Icon;

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50/40 px-6">
      <div className="max-w-sm text-center" aria-live="polite">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <Icon
            className={
              state === 'connecting'
                ? 'animate-spin text-primary-600'
                : 'text-primary-600'
            }
          />
        </div>
        <h1 className="text-base font-semibold text-neutral-900">
          {content.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {content.description}
        </p>
        {state === 'connect' && (
          <Button className="mt-5 rounded-full" onClick={onConnect}>
            Connect Instagram
          </Button>
        )}
        {state === 'reconnect' && (
          <Button className="mt-5 rounded-full" onClick={onConnect}>
            Reconnect Instagram
          </Button>
        )}
        {state === 'error' && (
          <Button className="mt-5 rounded-full gap-2" onClick={onRetry}>
            <IconRefresh className="h-4 w-4" /> Try again
          </Button>
        )}
      </div>
    </main>
  );
}

function ConnectionWarning({ onReconnect }: { onReconnect: () => void }) {
  return (
    <div className="flex flex-shrink-0 items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2">
      <IconAlertCircle className="h-4 w-4 text-amber-700" />
      <span className="text-xs font-medium text-amber-900">
        Instagram needs to be reconnected.
      </span>
      <Button
        size="sm"
        className="h-7 rounded-full px-3 text-xs"
        onClick={onReconnect}
      >
        Reconnect
      </Button>
    </div>
  );
}
