'use client';

import { useEffect, useState, type FC } from 'react';
import { IconLoader2, IconSparkles } from '@icons';
import type { ConversationStatus } from '../../../core/contracts';
import type { AISuggestion } from '@/types';
import { AI_FEATURES_ENABLED } from '@/lib/ai-features';
import { StateDisplay } from '@/components/shared/state-display';
import { ReplyBox, type ReplyMode } from '@/components/shared/reply-box';
import { useConfirmToast } from '@/components/shared/confirm-toast';
import type { InboxChatPanelProps } from './chat.types';
import {
  AISuggestionCard,
  type SuggestionStatus,
} from './components/ai-suggestion-card';
import { ChatHeader } from './components/chat-header';
import { MessageList } from './components/message-list';

export const InboxChatPanel: FC<InboxChatPanelProps> = ({
  selectedId,
  chatPanel,
  onStatusChange,
  onClose,
}) => {
  const {
    conversation,
    messages,
    replyText,
    isLoading,
    isSending,
    isAddingNote,
    selectedAttachments,
    retryingMessageIds,
    setReplyText,
    addAttachments,
    removeAttachment,
    handleSendReply,
    handleRetryMessage,
    handleAddNote,
  } = chatPanel;
  const { show: showConfirm } = useConfirmToast();
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus>('open');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>('reply');

  // Presentation-only placeholders. AI data and actions intentionally remain disabled.
  const suggestion = null as AISuggestion | null;
  const suggestionStatus = 'idle' as SuggestionStatus;
  const isSuggestionLoading = false;
  const handleSendSuggestion: (text?: string) => void = () => {};
  const handleScheduleSuggestion: (hours: number) => void = () => {};
  const handleDismissSuggestion = () => {};
  const handleGenerateSuggestion = () => {};

  useEffect(() => {
    if (conversation) setConversationStatus(conversation.status);
  }, [conversation]);

  const handleStatusChange = async (
    newStatus: ConversationStatus,
  ): Promise<boolean> => {
    if (!selectedId || isUpdatingStatus) return false;
    if (newStatus === conversationStatus) return true;
    const previousStatus = conversationStatus;
    setConversationStatus(newStatus);
    setStatusError(null);
    setIsUpdatingStatus(true);
    try {
      const persisted = await onStatusChange?.(selectedId, newStatus);
      if (persisted === false) throw new Error('Status persistence failed.');
      return true;
    } catch {
      setConversationStatus(previousStatus);
      setStatusError('Status could not be saved. Try again.');
      return false;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRequestClose = () =>
    showConfirm({
      message: 'Close this conversation? It will be marked as resolved.',
      confirmLabel: 'Confirm',
      onConfirm: () => {
        void handleStatusChange('resolved').then((saved) => {
          if (saved) onClose?.();
        });
      },
    });

  const handleComposerSubmit = async () => {
    if (replyMode === 'reply') {
      await handleSendReply();
      return;
    }
    const content = replyText.trim();
    if (!content) return;
    setNoteError(null);
    const saved = await handleAddNote(content);
    if (saved) setReplyText('');
    else setNoteError('Note could not be saved. Your text was preserved.');
  };

  if (!selectedId)
    return (
      <StateDisplay
        icon={IconSparkles}
        title="Select a conversation"
        description="Choose from the list on the left"
        className="bg-neutral-50/50"
      />
    );
  if (isLoading)
    return (
      <StateDisplay
        icon={IconLoader2}
        title="Loading conversation"
        description="Fetching messages and conversation details."
        status="loading"
        iconClassName="animate-spin"
      />
    );
  if (!conversation) return null;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ChatHeader
        contact={conversation.contact}
        status={conversationStatus}
        isUpdatingStatus={isUpdatingStatus}
        onStatusChange={(status) => void handleStatusChange(status)}
        onCopyLink={() =>
          void navigator.clipboard.writeText(
            `https://vendai.app/conversations/${selectedId}`,
          )
        }
        onClose={handleRequestClose}
      />
      {statusError && (
        <div
          role="alert"
          className="border-b border-red-100 bg-red-50 px-4 py-1.5 text-xs text-red-700"
        >
          {statusError}
        </div>
      )}
      <MessageList
        selectedId={selectedId}
        messages={messages}
        contact={conversation.contact}
        retryingMessageIds={retryingMessageIds}
        onRetryMessage={(messageId) => void handleRetryMessage(messageId)}
      />
      {AI_FEATURES_ENABLED && (
        <AISuggestionCard
          suggestion={suggestion}
          status={suggestionStatus}
          onSend={handleSendSuggestion}
          onSchedule={handleScheduleSuggestion}
          onDismiss={handleDismissSuggestion}
        />
      )}
      <ReplyBox
        contact={conversation.contact}
        value={replyText}
        mode={replyMode}
        attachments={selectedAttachments}
        isSending={isSending}
        isAddingNote={isAddingNote}
        noteError={noteError}
        isSuggestionLoading={isSuggestionLoading}
        onChange={setReplyText}
        onModeChange={setReplyMode}
        onAddAttachments={addAttachments}
        onRemoveAttachment={removeAttachment}
        onSubmit={() => void handleComposerSubmit()}
        onGenerateSuggestion={handleGenerateSuggestion}
      />
    </div>
  );
};
