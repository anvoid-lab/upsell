'use client';

import { AI_FEATURES_ENABLED } from '@/lib/ai-features';

import { FC, useState, useEffect, useRef } from 'react';
import {
  IconDots,
  IconBolt,
  IconPaperclip,
  IconMoodSmile,
  IconSparkles,
  IconPencil,
  IconCheck,
  IconChecks,
  IconAlertCircle,
  IconClockHour3,
  IconLoader2,
  IconRotate2,
  IconChevronDown,
  IconFileText,
  IconHash,
  IconLink,
  IconX,
} from '@icons';
import type { FollowUpType } from '@core/contracts';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  Contact,
  Message,
  AISuggestion,
  ConversationStatus,
  Platform,
} from '@/types';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Spinner } from '@/components/shared/spinner';
import { SectionLabel } from '@/components/shared/section-label';
import { useConfirmToast } from '@/components/shared/confirm-toast';
import type { UseChatPanelReturn } from './inbox-chat-panel.hook';

// ─── Static data ──────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 't1',
    label: 'Stock disponível',
    text: 'Olá! O produto está disponível em stock. Quer finalizar a compra?',
  },
  {
    id: 't2',
    label: 'Envio confirmado',
    text: 'A sua encomenda foi enviada! Entrega estimada: 3–5 dias úteis.',
  },
  {
    id: 't3',
    label: 'Desconto especial',
    text: 'Temos uma oferta especial — 10% de desconto no próximo pedido. Código: SAVE10',
  },
  {
    id: 't4',
    label: 'Follow-up pós-compra',
    text: 'Olá! Ficou satisfeito com a sua encomenda? Posso ajudar com mais alguma coisa?',
  },
  {
    id: 't5',
    label: 'Produto esgotado',
    text: 'Lamentamos, o produto está temporariamente esgotado. Quer ser notificado quando voltar?',
  },
];

const EMOJIS = [
  '😊',
  '👍',
  '🙏',
  '❤️',
  '✅',
  '🎉',
  '💪',
  '😂',
  '🔥',
  '💯',
  '👋',
  '🤝',
  '😍',
  '🤔',
  '👀',
  '✨',
];

const STATUS_STYLES: Record<ConversationStatus, string> = {
  open: 'bg-primary-50 text-primary-600 border-primary-200',
  pending: 'bg-neutral-50 text-neutral-600 border-neutral-200',
  resolved: 'bg-neutral-50 text-neutral-600 border-neutral-200',
};

const STATUS_DOT: Record<ConversationStatus, string> = {
  open: 'bg-primary-500',
  pending: 'bg-neutral-400',
  resolved: 'bg-neutral-400',
};

const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
};

// Mesmos rótulos usados em settings-content.tsx para as técnicas de venda —
// mantidos em inglês (o chrome da app), ao contrário do texto gerado (PT).
const TECHNIQUE_LABELS: Record<FollowUpType, string> = {
  urgency: 'Urgency',
  upsell: 'Upsell',
  social_proof: 'Social proof',
  cart_recovery: 'Cart recovery',
};

const PLATFORM_LABELS: Record<Platform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

const PLATFORM_COLORS: Record<Platform, string> = {
  whatsapp: 'bg-neutral-100 text-neutral-600',
  instagram: 'bg-neutral-100 text-neutral-600',
  facebook: 'bg-neutral-100 text-neutral-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupMessagesByDate(messages: Message[]) {
  if (messages.length === 0) return [];
  if (messages.length <= 2) return [{ dateLabel: 'Today', messages }];
  const split = Math.max(1, messages.length - 2);
  return [
    { dateLabel: 'Yesterday', messages: messages.slice(0, split) },
    { dateLabel: 'Today', messages: messages.slice(split) },
  ];
}

function messagesForDisplay(messages: Message[]): Message[] {
  return messages.filter((message) =>
    !message.hidden && !/^reacted\s+.+\s+to your message\.?$/iu.test(message.content.trim()),
  ).reduce<Message[]>((result, message) => {
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
    const content = [...new Set([previous.content.trim(), message.content.trim()].filter(Boolean))]
      .join('\n');
    const statuses = [previous.delivery_status, message.delivery_status];
    const deliveryStatus = statuses.includes('failed') ? 'failed'
      : statuses.includes('read') ? 'read'
        : statuses.includes('delivered') ? 'delivered'
          : statuses.includes('sent') ? 'sent'
            : statuses.includes('sending') ? 'sending'
              : statuses.includes('pending') ? 'pending' : null;

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

// ─── Component ────────────────────────────────────────────────────────────────

interface InboxChatPanelProps {
  selectedId: string | null;
  /** Detido pelo InboxView — uma instância só, partilhada com o painel de detalhes. */
  chatPanel: UseChatPanelReturn;
  onStatusChange?: (id: string, status: ConversationStatus) => Promise<boolean>;
  onClose?: () => void;
}

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

  const [convStatus, setConvStatus] = useState<ConversationStatus>('open');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [replyMode, setReplyMode] = useState<'reply' | 'note'>('reply');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Preserved presentation only; all AI actions and data sources were removed.
  const suggestion = null as AISuggestion | null;
  const isSuggestionLoading = false;
  const suggestionStatus = 'idle' as
    | 'idle'
    | 'sending'
    | 'scheduled'
    | 'dismissed';
  const handleSendSuggestion: (text?: string) => void = () => {};
  const handleScheduleSuggestion: (hours: number) => void = () => {};
  const handleDismissSuggestion = () => {};
  const handleGenerateSuggestion = () => {};

  const [editedSuggestion, setEditedSuggestion] = useState('');
  const [isEditingSuggestion, setIsEditingSuggestion] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation) setConvStatus(conversation.status);
  }, [conversation]);

  useEffect(() => {
    setEditedSuggestion(suggestion?.message ?? '');
    setIsEditingSuggestion(false);
  }, [suggestion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedId, messages]);

  const handleStatusChange = async (
    newStatus: ConversationStatus,
  ): Promise<boolean> => {
    if (!selectedId || isUpdatingStatus) return false;
    if (newStatus === convStatus) return true;
    const previousStatus = convStatus;
    setConvStatus(newStatus);
    setStatusError(null);
    setIsUpdatingStatus(true);
    try {
      const persisted = await onStatusChange?.(selectedId, newStatus);
      if (persisted === false) throw new Error('Status persistence failed.');
      return true;
    } catch {
      setConvStatus(previousStatus);
      setStatusError('Status could not be saved. Try again.');
      return false;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRequestClose = () => {
    showConfirm({
      message: 'Close this conversation? It will be marked as resolved.',
      confirmLabel: 'Confirm',
      onConfirm: () => {
        void handleStatusChange('resolved').then((saved) => {
          if (saved) onClose?.();
        });
      },
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyText(val);
    setShowTemplates(val.startsWith('/'));
    if (!val.startsWith('/')) setShowTemplates(false);
  };

  const selectTemplate = (text: string) => {
    setReplyText(text);
    setShowTemplates(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const openTemplates = () => {
    setReplyText('/');
    setShowTemplates(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleEmojiSelect = (emoji: string) => {
    setReplyText(replyText + emoji);
    setShowEmojiPicker(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `https://vendai.app/conversations/${selectedId}`,
    );
  };

  const templateQuery = replyText.startsWith('/')
    ? replyText.slice(1).toLowerCase()
    : '';
  const filteredTpls = TEMPLATES.filter(
    (t) =>
      !templateQuery ||
      t.label.toLowerCase().includes(templateQuery) ||
      t.text.toLowerCase().includes(templateQuery),
  );
  const groups = groupMessagesByDate(messagesForDisplay(messages));

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
      <div className="flex-1 flex items-center justify-center bg-neutral-50/50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <IconSparkles className="w-5 h-5 text-neutral-400" />
          </div>
          <p className="text-sm font-semibold text-neutral-600">
            Select a conversation
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Choose from the list on the left
          </p>
        </div>
      </div>
    );

  if (isLoading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );

  if (!conversation) return null;
  const { contact } = conversation;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* ── Header ── */}
      <div className="h-[52px] px-4 border-b border-neutral-200 flex items-center gap-2 flex-shrink-0 bg-white">
        <UserAvatar
          initials={contact.initials}
          background={contact.avatar_bg}
          color={contact.avatar_color}
          src={contact.avatar_url}
          alt={contact.name}
          platform={contact.platform}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 leading-none">
            {contact.name}
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5 capitalize">
            {contact.platform} · Active now
          </p>
        </div>

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={isUpdatingStatus}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                STATUS_STYLES[convStatus],
              )}
            >
              {STATUS_LABELS[convStatus]}
              <IconChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {(['open', 'pending', 'resolved'] as ConversationStatus[]).map(
              (s) => (
                <DropdownMenuItem
                  key={s}
                  disabled={isUpdatingStatus}
                  onClick={() => void handleStatusChange(s)}
                  className={cn('text-xs', convStatus === s && 'font-semibold')}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0',
                      STATUS_DOT[s],
                    )}
                  />
                  {STATUS_LABELS[s]}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 rounded-full text-neutral-400"
            >
              <IconDots className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem
              onClick={handleCopyLink}
              className="text-xs gap-2"
            >
              <IconLink className="w-3.5 h-3.5" /> Copy conversation link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleRequestClose()}
              className="text-xs text-red-600 gap-2 focus:text-red-600"
            >
              <IconX className="w-3.5 h-3.5" /> Close conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="secondary"
          size="sm"
          className="rounded-full h-7 px-3 text-xs"
          onClick={() => handleRequestClose()}
        >
          Close
        </Button>
      </div>

      {statusError && (
        <div
          role="alert"
          className="border-b border-red-100 bg-red-50 px-4 py-1.5 text-xs text-red-700"
        >
          {statusError}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-auto px-5 py-5 flex flex-col gap-0 bg-neutral-50/40">
        {groups.map((group) => (
          <div key={group.dateLabel}>
            <DateSeparator label={group.dateLabel} />
            <div className="flex flex-col gap-3">
              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  contact={contact}
                  isRetrying={retryingMessageIds.has(msg.id)}
                  onRetry={() => void handleRetryMessage(msg.id)}
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* ── AI suggestion ──
          No "generating" state here: while the AI works there is no card at
          all, only the pulsing icon in the reply toolbar. The card appears
          once, already holding the finished suggestion. */}
      {AI_FEATURES_ENABLED &&
        suggestion &&
        (suggestionStatus === 'idle' || suggestionStatus === 'sending') && (
          // O único elemento que aparece sem qualquer acção do vendedor — o
          // webhook gera em segundo plano e o Realtime empurra-o para aqui.
          <div className="mx-4 mb-2 flex-shrink-0 relative animate-fade-in motion-reduce:animate-none">
            <div className="absolute inset-0 rounded-2xl bg-primary-500/10 blur-sm" />
            <div className="relative p-3.5 bg-white border border-primary-200 rounded-2xl">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                  <IconSparkles className="w-3 h-3 text-primary-500" />
                </div>
                <span className="text-xs font-semibold text-primary-600 flex-1">
                  AI follow-up suggestion
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-500 text-[10px] font-semibold">
                  {TECHNIQUE_LABELS[suggestion.type] ?? suggestion.type}
                </span>
                <span className="text-[10px] text-neutral-400">
                  Click to edit
                </span>
              </div>
              {isEditingSuggestion ? (
                <Textarea
                  value={editedSuggestion}
                  onChange={(e) => setEditedSuggestion(e.target.value)}
                  autoFocus
                  rows={2}
                  className="text-xs border border-primary-200 rounded-lg p-2 mb-1.5 resize-none focus-visible:ring-1 focus-visible:ring-primary-400 bg-primary-50/30"
                />
              ) : (
                <p
                  onClick={() => setIsEditingSuggestion(true)}
                  className="text-xs text-neutral-600 leading-relaxed mb-1.5 pl-0.5 cursor-text hover:text-neutral-800 transition-colors"
                >
                  &ldquo;{editedSuggestion}&rdquo;
                </p>
              )}
              {suggestion.rationale && (
                <p className="text-[11px] text-neutral-400 leading-relaxed pl-0.5">
                  {suggestion.rationale}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  onClick={() =>
                    handleSendSuggestion(
                      editedSuggestion !== suggestion.message
                        ? editedSuggestion
                        : undefined,
                    )
                  }
                  disabled={suggestionStatus === 'sending'}
                  size="sm"
                  className="rounded-full h-7 px-3 text-xs"
                >
                  Send now
                </Button>
                <Button
                  onClick={() => handleScheduleSuggestion(6)}
                  variant="outline"
                  size="sm"
                  className="rounded-full h-7 px-3 text-xs"
                >
                  Schedule 6h
                </Button>
                <Button
                  onClick={handleDismissSuggestion}
                  variant="ghost"
                  size="sm"
                  className="rounded-full h-7 px-3 text-xs text-neutral-400"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

      {AI_FEATURES_ENABLED && suggestionStatus === 'scheduled' && (
        <div className="mx-4 mb-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-full text-xs text-primary-700 font-medium flex items-center gap-1.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
          Follow-up scheduled — VendAI will send it automatically
        </div>
      )}

      {/* ── Reply box ── */}
      <div className="mx-4 mb-4 flex-shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) addAttachments(event.target.files);
            event.target.value = '';
          }}
        />
        <div
          className={cn(
            'border rounded-2xl overflow-hidden bg-white shadow-sm',
            replyMode === 'note' ? 'border-neutral-300' : 'border-neutral-200',
          )}
        >
          {/* Box header */}
          <div
            className={cn(
              'px-3 py-1.5 border-b flex items-center gap-2',
              replyMode === 'note'
                ? 'border-neutral-200 bg-neutral-50/50'
                : 'border-neutral-100',
            )}
          >
            {replyMode === 'reply' ? (
              <>
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    PLATFORM_COLORS[contact.platform],
                  )}
                >
                  {PLATFORM_LABELS[contact.platform]}
                </span>
                <span className="text-[10px] text-neutral-400">
                  → {contact.name}
                </span>
                <span className="ml-auto text-[10px] text-neutral-300 flex items-center gap-1">
                  <IconHash className="w-2.5 h-2.5" /> type / for templates
                </span>
              </>
            ) : (
              <span className="text-[10px] font-medium text-neutral-700">
                Internal note · not visible to customer
              </span>
            )}
          </div>

          {/* Template picker */}
          {showTemplates && filteredTpls.length > 0 && (
            <div className="border-b border-neutral-100">
              <div className="px-3 py-1.5 flex items-center gap-1.5">
                <IconHash className="w-3 h-3 text-neutral-400" />
                <SectionLabel>Templates</SectionLabel>
              </div>
              {filteredTpls.map((t) => (
                <button
                  key={t.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectTemplate(t.text);
                  }}
                  className="w-full flex flex-col px-3 py-2 text-left hover:bg-neutral-50 border-t border-neutral-50 transition-colors"
                >
                  <span className="text-xs font-medium text-neutral-800">
                    {t.label}
                  </span>
                  <span className="text-[11px] text-neutral-400 truncate">
                    {t.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className="border-b border-neutral-100 px-3 py-2 flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    handleEmojiSelect(e);
                  }}
                  className="text-base w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {replyMode === 'reply' && selectedAttachments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-3 py-2">
              {selectedAttachments.map((item) => (
                <div
                  key={item.id}
                  className="group relative h-20 w-20 flex-none overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
                >
                  {item.type === 'video' ? (
                    <video
                      src={item.previewUrl}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => removeAttachment(item.id)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white"
                  >
                    <IconX className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={replyText}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                void handleComposerSubmit();
            }}
            onBlur={() =>
              setTimeout(() => {
                setShowTemplates(false);
              }, 150)
            }
            placeholder={
              replyMode === 'reply'
                ? 'Type a message… (⌘↵ to send)'
                : 'Write an internal note…'
            }
            rows={2}
            className={cn(
              'border-0 shadow-none rounded-none focus-visible:ring-0 resize-none text-sm px-3 py-2',
              replyMode === 'note'
                ? 'bg-neutral-50/30 placeholder:text-neutral-300'
                : 'placeholder:text-neutral-300',
            )}
          />

          {/* Footer */}
          <div
            className={cn(
              'px-3 py-2 border-t flex items-center justify-between',
              replyMode === 'note'
                ? 'border-neutral-200 bg-neutral-50/30'
                : 'border-neutral-100',
            )}
          >
            <div className="flex gap-0.5">
              {/* This icon is the indicator that the AI is working: it pulses
                  between more and less vivid while generating, and only becomes
                  clickable again once it finishes. disabled:opacity-100
                  overrides the Button's default disabled fade, which would
                  otherwise flatten the pulse. */}
              {AI_FEATURES_ENABLED && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'w-7 h-7 rounded-full text-primary-500',
                    isSuggestionLoading
                      ? 'animate-pulse motion-reduce:animate-none disabled:opacity-100'
                      : 'hover:bg-primary-50',
                  )}
                  title={
                    isSuggestionLoading
                      ? 'Generating suggestion…'
                      : 'Generate AI suggestion'
                  }
                  onClick={handleGenerateSuggestion}
                  disabled
                >
                  <IconSparkles className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full text-neutral-400"
                title="Templates"
                onClick={openTemplates}
              >
                <IconBolt className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full text-neutral-400"
                title="Attach file"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconPaperclip className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'w-7 h-7 rounded-full',
                  showEmojiPicker
                    ? 'text-primary-500 bg-primary-50'
                    : 'text-neutral-400',
                )}
                title="Emoji"
                onClick={() => setShowEmojiPicker((p) => !p)}
              >
                <IconMoodSmile className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 p-0.5 bg-neutral-100 rounded-full mr-1">
                <button
                  onClick={() => setReplyMode('reply')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all',
                    replyMode === 'reply'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-600',
                  )}
                >
                  <IconPencil className="w-3 h-3" /> Reply
                </button>
                <button
                  onClick={() => setReplyMode('note')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all',
                    replyMode === 'note'
                      ? 'bg-neutral-700 text-neutral-50 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-600',
                  )}
                >
                  <IconFileText className="w-3 h-3" /> Note
                </button>
              </div>
              <Button
                onClick={() => void handleComposerSubmit()}
                disabled={
                  (replyMode === 'reply'
                    ? !replyText.trim() && selectedAttachments.length === 0
                    : !replyText.trim()) ||
                  isSending ||
                  isAddingNote
                }
                size="sm"
                className={cn(
                  'rounded-full h-7 px-4 text-xs',
                  replyMode === 'note' &&
                    'bg-neutral-700 hover:bg-neutral-800 text-neutral-50',
                )}
              >
                {isAddingNote
                  ? 'Saving…'
                  : isSending
                    ? 'Sending…'
                    : replyMode === 'note'
                      ? 'Add note'
                      : 'Send'}
              </Button>
            </div>
          </div>
          {noteError && (
            <p role="alert" className="px-3 pb-2 text-xs text-red-600">
              {noteError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const DateSeparator: FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-neutral-100" />
    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
      {label}
    </span>
    <div className="flex-1 h-px bg-neutral-100" />
  </div>
);

const MessageBubble: FC<{
  message: Message;
  contact: Contact;
  isRetrying: boolean;
  onRetry: () => void;
}> = ({ message, contact, isRetrying, onRetry }) => {
  const isOut = message.direction === 'out';
  const deliveryStatus = message.delivery_status ?? 'sent';
  const isPending =
    deliveryStatus === 'pending' || deliveryStatus === 'sending';
  const isFailed = deliveryStatus === 'failed';
  return (
    <div
      data-message-id={message.id}
      className={cn(
        'flex max-w-[78%] items-start gap-2 ',
        // Uma mensagem recebida aparece sem o vendedor ter feito nada: entrar
        // em vez de surgir de repente é o que lhe diz que algo mudou.
        'animate-fade-in motion-reduce:animate-none',
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
                ? 'bg-red-50 text-red-800 border border-red-200 rounded-2xl rounded-br-md'
                : 'bg-primary-600 text-white rounded-2xl rounded-br-md'
              : 'bg-white text-neutral-800 rounded-2xl rounded-bl-md border border-neutral-100',
          )}
        >
          {message.quoted_message && (
            <button
              type="button"
              onClick={() => {
                if (!message.reply_to_message_id) return;
                const target = document.querySelector<HTMLElement>(
                  `[data-message-id="${CSS.escape(message.reply_to_message_id)}"]`,
                );
                target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target?.animate(
                  [{ opacity: 0.55 }, { opacity: 1 }],
                  { duration: 700, easing: 'ease-out' },
                );
              }}
              className={cn(
                'mb-2 flex w-full items-center gap-2 overflow-hidden border-l-2 px-2 py-1 text-left text-xs opacity-80',
                isOut ? 'border-white/60 bg-white/10' : 'border-primary-400 bg-neutral-50',
                message.reply_to_message_id && 'cursor-pointer hover:opacity-100',
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
                  {message.quoted_message.text || attachmentSummary(message.quoted_message.attachments)}
                </span>
              </span>
              <QuotedAttachmentPreview attachments={message.quoted_message.attachments} />
            </button>
          )}
          {message.attachment.length > 0 && (
            <MessageAttachments attachments={message.attachment} />
          )}
          {message.provider_deleted_at ? (
            <p className="italic opacity-70">Message deleted</p>
          ) : message.content && (
            <p className={cn(message.attachment.length > 0 && 'mt-2')}>
              <LinkifiedText text={message.content} />
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span
            className="text-[10px] text-neutral-400"
            suppressHydrationWarning
          >
            {formatTime(message.timestamp)}
          </span>
          {AI_FEATURES_ENABLED && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary-400 font-medium">
              <IconSparkles className="w-2.5 h-2.5" /> VendAI
            </span>
          )}
          {isOut && isPending && (
            <span className="flex items-center gap-1 text-[10px] text-neutral-400">
              <IconClockHour3 className="w-3 h-3" /> Pending
            </span>
          )}
          {isOut && (deliveryStatus === 'sent' || deliveryStatus === 'delivered') && (
            <span
              aria-label="Sent"
              title="Sent"
              className="flex items-center text-primary-500"
            >
              <IconCheck className="w-3.5 h-3.5" />
            </span>
          )}
          {isOut && deliveryStatus === 'read' && (
            <span
              aria-label="Seen"
              title="Seen"
              className="flex items-center text-primary-500"
            >
              <IconChecks className="w-3.5 h-3.5" />
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
                <IconAlertCircle className="w-3 h-3" /> Failed
              </span>
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="flex items-center gap-1 font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                {isRetrying ? (
                  <IconLoader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <IconRotate2 className="w-3 h-3" />
                )}
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
                title={reaction.direction === 'out' ? 'You reacted' : `${contact.name} reacted`}
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
};

const QuotedAttachmentPreview: FC<{
  attachments: Message['attachment'];
}> = ({ attachments }) => {
  const attachment = attachments.find((item) =>
    item.media_url && !item.unavailable &&
    (item.type === 'image' || item.type === 'sticker' || item.type === 'video'),
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
};

function attachmentSummary(attachments: Message['attachment']): string {
  if (attachments.length === 0) return 'Message';
  if (attachments.length > 1) return `${attachments.length} attachments`;
  switch (attachments[0]?.type) {
    case 'image': return 'Photo';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    default: return 'Attachment';
  }
}

const MessageAttachments: FC<{ attachments: Message['attachment'] }> = ({
  attachments,
}) => (
  <div
    className={cn(
      'grid gap-1.5 overflow-hidden rounded-xl',
      attachments.length > 1 && 'grid-cols-2',
    )}
  >
    {attachments.map((attachment, index) => {
      const url = attachment.media_url;
      if (!url || attachment.unavailable) {
        return (
          <div
            key={attachment.external_id ?? index}
            className="flex min-h-20 items-center justify-center rounded-lg bg-black/5 px-3 text-xs opacity-70"
          >
            Media unavailable
          </div>
        );
      }
      if (attachment.type === 'video') {
        return (
          <video
            key={attachment.external_id ?? url}
            src={url}
            controls
            playsInline
            preload="metadata"
            className="max-h-72 w-full rounded-lg object-cover"
          />
        );
      }
      if (attachment.type === 'image' || attachment.type === 'sticker') {
        return (
          <a
            key={attachment.external_id ?? url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block min-h-32 min-w-48 overflow-hidden rounded-lg"
          >
            {/* Provider CDNs are dynamic, so a native image avoids coupling
                the inbox to a hostname allowlist. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={attachment.filename ?? 'Message attachment'}
              className="h-full min-h-32 w-full object-cover"
            />
          </a>
        );
      }
      return (
        <a
          key={attachment.external_id ?? url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-16 items-center gap-2 rounded-lg bg-black/5 px-3 text-xs underline underline-offset-2"
        >
          <IconFileText className="h-4 w-4" />
          {attachment.filename ?? 'Open attachment'}
        </a>
      );
    })}
  </div>
);

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const LinkifiedText: FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(URL_PATTERN).map((part, index) =>
      /^https?:\/\//.test(part) ? (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline underline-offset-2"
        >
          {part}
        </a>
      ) : (
        part
      ),
    )}
  </>
);
