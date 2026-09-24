import { useEffect, useRef } from 'react';
import type { Contact, Message } from '../../../../core/contracts';
import { groupMessagesByDate, messagesForDisplay } from '../chat.utils';
import { MessageBubble } from './message-bubble';

type MessageListProps = {
  selectedId: string;
  messages: Message[];
  contact: Contact;
  retryingMessageIds: Set<string>;
  onRetryMessage: (messageId: string) => void;
};

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-100" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        {label}
      </span>
      <div className="h-px flex-1 bg-neutral-100" />
    </div>
  );
}

export function MessageList({
  selectedId,
  messages,
  contact,
  retryingMessageIds,
  onRetryMessage,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedId, messages]);
  const groups = groupMessagesByDate(messagesForDisplay(messages));
  return (
    <div className="flex flex-1 flex-col gap-0 overflow-auto bg-neutral-50/40 px-5 py-5">
      {groups.map((group) => (
        <div key={group.dateLabel}>
          <DateSeparator label={group.dateLabel} />
          <div className="flex flex-col gap-3">
            {group.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                contact={contact}
                isRetrying={retryingMessageIds.has(message.id)}
                onRetry={() => onRetryMessage(message.id)}
              />
            ))}
          </div>
        </div>
      ))}
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}
