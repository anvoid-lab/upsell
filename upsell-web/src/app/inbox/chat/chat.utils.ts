import {
  ConversationStatus,
  FollowUpType,
  Message,
  Platform,
} from '../../../core/contracts';

export function groupMessagesByDate(messages: Message[]) {
  if (messages.length === 0) return [];
  if (messages.length <= 2) return [{ dateLabel: 'Today', messages }];
  const split = Math.max(1, messages.length - 2);
  return [
    { dateLabel: 'Yesterday', messages: messages.slice(0, split) },
    { dateLabel: 'Today', messages: messages.slice(split) },
  ];
}

export function messagesForDisplay(messages: Message[]): Message[] {
  return messages
    .filter(
      (message) =>
        !message.hidden &&
        !/^reacted\s+.+\s+to your message\.?$/iu.test(message.content.trim()),
    )
    .reduce<Message[]>((result, message) => {
      const previous = result.at(-1);
      const closeTogether = previous
        ? Math.abs(message.timestamp.getTime() - previous.timestamp.getTime()) <= 10_000
        : false;
      const mediaBatch = Boolean(
        previous && (previous.attachment.length > 0 || message.attachment.length > 0),
      );
      if (!previous || previous.direction !== message.direction || !closeTogether || !mediaBatch) {
        result.push(message);
        return result;
      }

      const combinedAttachments = [...previous.attachment, ...message.attachment];
      const hasRemoteMedia = combinedAttachments.some(
        (attachment) => attachment.media_url && !attachment.media_url.startsWith('blob:'),
      );
      const attachmentKeys = new Set<string>();
      const attachment = combinedAttachments.filter((item, index) => {
        if (hasRemoteMedia && (!item.media_url || item.media_url.startsWith('blob:'))) return false;
        const key = item.external_id ?? item.media_url ?? `${item.filename ?? 'attachment'}:${index}`;
        if (attachmentKeys.has(key)) return false;
        attachmentKeys.add(key);
        return true;
      });
      const content = [...new Set([previous.content.trim(), message.content.trim()].filter(Boolean))].join('\n');
      const statuses = [previous.delivery_status, message.delivery_status];
      const deliveryStatus = statuses.includes('failed')
        ? 'failed'
        : statuses.includes('read')
          ? 'read'
          : statuses.includes('delivered')
            ? 'delivered'
            : statuses.includes('sent')
              ? 'sent'
              : statuses.includes('sending')
                ? 'sending'
                : statuses.includes('pending')
                  ? 'pending'
                  : null;

      result[result.length - 1] = {
        ...previous,
        content,
        attachment,
        timestamp: message.timestamp,
        channel_message_id: message.channel_message_id ?? previous.channel_message_id,
        delivery_status: deliveryStatus,
        delivery_error: message.delivery_error ?? previous.delivery_error,
        delivery_updated_at: message.delivery_updated_at ?? previous.delivery_updated_at,
        delivered_at: message.delivered_at ?? previous.delivered_at,
        read_at: message.read_at ?? previous.read_at,
        edited_at: message.edited_at ?? previous.edited_at,
        provider_deleted_at: message.provider_deleted_at ?? previous.provider_deleted_at,
        reactions: [...previous.reactions, ...message.reactions],
        quoted_message: previous.quoted_message ?? message.quoted_message,
        reply_to_message_id: previous.reply_to_message_id ?? message.reply_to_message_id,
      };
      return result;
    }, []);
}

export function attachmentSummary(attachments: Message['attachment']): string {
  if (attachments.length === 0) return 'Message';
  if (attachments.length > 1) return `${attachments.length} attachments`;
  switch (attachments[0]?.type) {
    case 'image': return 'Photo';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    default: return 'Attachment';
  }
}

export const STATUS_STYLES: Record<ConversationStatus, string> = {
  open: 'bg-primary-50 text-primary-600 border-primary-200',
  pending: 'bg-neutral-50 text-neutral-600 border-neutral-200',
  resolved: 'bg-neutral-50 text-neutral-600 border-neutral-200',
};

export const STATUS_DOT: Record<ConversationStatus, string> = {
  open: 'bg-primary-500',
  pending: 'bg-neutral-400',
  resolved: 'bg-neutral-400',
};

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
};

// Mesmos rótulos usados em settings-content.tsx para as técnicas de venda —
// mantidos em inglês (o chrome da app), ao contrário do texto gerado (PT).
export const TECHNIQUE_LABELS: Record<FollowUpType, string> = {
  urgency: 'Urgency',
  upsell: 'Upsell',
  social_proof: 'Social proof',
  cart_recovery: 'Cart recovery',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  whatsapp: 'bg-neutral-100 text-neutral-600',
  instagram: 'bg-neutral-100 text-neutral-600',
  facebook: 'bg-neutral-100 text-neutral-600',
};
