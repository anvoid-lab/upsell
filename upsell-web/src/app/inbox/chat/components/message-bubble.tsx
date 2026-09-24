import {
  IconAlertCircle,
  IconCheck,
  IconChecks,
  IconClockHour3,
  IconLoader2,
  IconRotate2,
  IconSparkles,
} from '@icons';
import type { Contact, Message } from '../../../../core/contracts';
import { AI_FEATURES_ENABLED } from '@/lib/ai-features';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/user-avatar';
import { attachmentSummary } from '../chat.utils';
import { LinkifiedText } from './linkified-text';
import { MessageAttachments } from './message-attachments';

type MessageBubbleProps = {
  message: Message;
  contact: Contact;
  isRetrying: boolean;
  onRetry: () => void;
};

function QuotedAttachmentPreview({
  attachments,
}: {
  attachments: Message['attachment'];
}) {
  const attachment = attachments.find(
    (item) =>
      item.media_url &&
      !item.unavailable &&
      ['image', 'sticker', 'video'].includes(item.type),
  );
  if (!attachment?.media_url) return null;
  return attachment.type === 'video' ? (
    <video
      src={attachment.media_url}
      muted
      playsInline
      preload="metadata"
      className="h-11 w-11 flex-none rounded-md object-cover"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={attachment.media_url}
      alt="Quoted attachment"
      className="h-11 w-11 flex-none rounded-md object-cover"
    />
  );
}

export function MessageBubble({
  message,
  contact,
  isRetrying,
  onRetry,
}: MessageBubbleProps) {
  const isOut = message.direction === 'out';
  const deliveryStatus = message.delivery_status ?? 'sent';
  const isPending =
    deliveryStatus === 'pending' || deliveryStatus === 'sending';
  const isFailed = deliveryStatus === 'failed';

  const scrollToQuotedMessage = () => {
    if (!message.reply_to_message_id) return;
    const target = document.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(message.reply_to_message_id)}"]`,
    );
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.animate([{ opacity: 0.55 }, { opacity: 1 }], {
      duration: 700,
      easing: 'ease-out',
    });
  };

  return (
    <div
      data-message-id={message.id}
      className={cn(
        'flex max-w-[78%] items-start gap-2 animate-fade-in motion-reduce:animate-none',
        isOut ? 'self-end' : 'self-start',
      )}
    >
      {!isOut && (
        <UserAvatar
          initials={contact.initials}
          background={contact.avatar_bg}
          color={contact.avatar_color}
          src={contact.avatar_url}
          alt={contact.name}
          platform={contact.platform}
        />
      )}
      <div
        className={cn(
          'flex min-w-0 flex-col',
          isOut ? 'items-end' : 'items-start',
        )}
      >
        <div
          className={cn(
            'px-4 py-2.5 text-sm leading-relaxed shadow-sm',
            isOut
              ? isFailed
                ? 'rounded-2xl rounded-br-md border border-red-200 bg-red-50 text-red-800'
                : 'rounded-2xl rounded-br-md bg-primary-600 text-white'
              : 'rounded-2xl rounded-bl-md border border-neutral-100 bg-white text-neutral-800',
          )}
        >
          {message.quoted_message && (
            <button
              type="button"
              onClick={scrollToQuotedMessage}
              className={cn(
                'mb-2 flex w-full items-center gap-2 overflow-hidden border-l-2 px-2 py-1 text-left text-xs opacity-80',
                isOut
                  ? 'border-white/60 bg-white/10'
                  : 'border-primary-400 bg-neutral-50',
                message.reply_to_message_id &&
                  'cursor-pointer hover:opacity-100',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {message.quoted_message.direction === 'out'
                    ? 'You'
                    : message.quoted_message.direction === 'in'
                      ? contact.name
                      : 'Replied message'}
                </span>
                <span className="block max-w-64 truncate">
                  {message.quoted_message.text ||
                    attachmentSummary(message.quoted_message.attachments)}
                </span>
              </span>
              <QuotedAttachmentPreview
                attachments={message.quoted_message.attachments}
              />
            </button>
          )}
          {message.attachment.length > 0 && (
            <MessageAttachments attachments={message.attachment} />
          )}
          {message.provider_deleted_at ? (
            <p className="italic opacity-70">Message deleted</p>
          ) : (
            message.content && (
              <p className={cn(message.attachment.length > 0 && 'mt-2')}>
                <LinkifiedText text={message.content} />
              </p>
            )
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 px-1">
          <span
            className="text-[10px] text-neutral-400"
            suppressHydrationWarning
          >
            {formatTime(message.timestamp)}
          </span>
          {AI_FEATURES_ENABLED && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary-400">
              <IconSparkles className="h-2.5 w-2.5" /> VendAI
            </span>
          )}
          {isOut && isPending && (
            <span className="flex items-center gap-1 text-[10px] text-neutral-400">
              <IconClockHour3 className="h-3 w-3" /> Pending
            </span>
          )}
          {isOut &&
            (deliveryStatus === 'sent' || deliveryStatus === 'delivered') && (
              <span
                aria-label="Sent"
                title="Sent"
                className="flex items-center text-primary-500"
              >
                <IconCheck className="h-3.5 w-3.5" />
              </span>
            )}
          {isOut && deliveryStatus === 'read' && (
            <span
              aria-label="Seen"
              title="Seen"
              className="flex items-center text-primary-500"
            >
              <IconChecks className="h-3.5 w-3.5" />
            </span>
          )}
          {message.edited_at && (
            <span className="text-[10px] text-neutral-400">Edited</span>
          )}
          {isOut && isFailed && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-600">
              <span
                className="flex items-center gap-1"
                title={message.delivery_error ?? undefined}
              >
                <IconAlertCircle className="h-3 w-3" /> Failed
              </span>
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="flex items-center gap-1 font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                {isRetrying ? (
                  <IconLoader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <IconRotate2 className="h-3 w-3" />
                )}{' '}
                Retry
              </button>
            </div>
          )}
        </div>
        {message.reactions.length > 0 && (
          <div className="-mt-0.5 flex gap-1 px-1">
            {message.reactions.map((reaction, index) => (
              <span
                key={`${reaction.sender_id ?? 'sender'}:${reaction.value}:${index}`}
                className="rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-xs shadow-sm"
                title={
                  reaction.direction === 'out'
                    ? 'You reacted'
                    : `${contact.name} reacted`
                }
              >
                {reaction.value}
              </span>
            ))}
          </div>
        )}
        {isOut && isFailed && message.delivery_error && (
          <p className="mt-1 max-w-sm px-1 text-right text-[10px] text-red-500">
            {message.delivery_error}
          </p>
        )}
      </div>
    </div>
  );
}
