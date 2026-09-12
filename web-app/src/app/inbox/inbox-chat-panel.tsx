'use client';

import { AI_FEATURES_ENABLED } from '@/lib/ai-features';

import { FC, useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  Zap,
  Paperclip,
  Smile,
  Sparkles,
  PenLine,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  UserPlus,
  Hash,
  Link,
  X,
} from 'lucide-react';
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
  Message,
  AISuggestion,
  ConversationStatus,
  Platform,
} from '@/types';
import { Avatar } from '@/components/shared/avatar';
import { Spinner } from '@/components/shared/spinner';
import { SectionLabel } from '@/components/shared/section-label';
import { useConfirmToast } from '@/components/shared/confirm-toast';
import type { UseChatPanelReturn } from './inbox-chat-panel.hook';

// ─── Static data ──────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  { id: '1', name: 'Sofia Dias', initials: 'SD' },
  { id: '2', name: 'Bruno Santos', initials: 'BS' },
  { id: '3', name: 'Ana Ferreira', initials: 'AF' },
];

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

// ─── Component ────────────────────────────────────────────────────────────────

interface InboxChatPanelProps {
  selectedId: string | null;
  /** Detido pelo InboxView — uma instância só, partilhada com o painel de detalhes. */
  chatPanel: UseChatPanelReturn;
  onStatusChange?: (id: string, status: ConversationStatus) => void;
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
    setReplyText,
    handleSendReply,
  } = chatPanel;

  const { show: showConfirm } = useConfirmToast();

  const [convStatus, setConvStatus] = useState<ConversationStatus>('open');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [replyMode, setReplyMode] = useState<'reply' | 'note'>('reply');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Preserved presentation only; all AI actions and data sources were removed.
  const suggestion = null as AISuggestion | null;
  const isSuggestionLoading = false;
  const suggestionStatus = 'idle' as 'idle' | 'sending' | 'scheduled' | 'dismissed';
  const handleSendSuggestion = (_text?: string) => {};
  const handleScheduleSuggestion = (_hours: number) => {};
  const handleDismissSuggestion = () => {};
  const handleGenerateSuggestion = () => {};

  const [editedSuggestion, setEditedSuggestion] = useState('');
  const [isEditingSuggestion, setIsEditingSuggestion] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversation) setConvStatus(conversation.status);
  }, [conversation]);

  useEffect(() => {
    setEditedSuggestion(suggestion?.message ?? '');
    setIsEditingSuggestion(false);
  }, [suggestion]);

  const handleStatusChange = (newStatus: ConversationStatus) => {
    setConvStatus(newStatus);
    if (selectedId) onStatusChange?.(selectedId, newStatus);
  };

  const handleRequestClose = () => {
    showConfirm({
      message: 'Close this conversation? It will be marked as resolved.',
      confirmLabel: 'Confirm',
      onConfirm: () => onClose?.(),
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
  const assignedMember = TEAM_MEMBERS.find((m) => m.id === assignedTo);
  const groups = groupMessagesByDate(messages);

  if (!selectedId)
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-50/50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-neutral-400" />
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
        <Avatar
          initials={contact.initials}
          bg={contact.avatar_bg}
          color={contact.avatar_color}
          size="sm"
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
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                STATUS_STYLES[convStatus],
              )}
            >
              {STATUS_LABELS[convStatus]}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {(['open', 'pending', 'resolved'] as ConversationStatus[]).map(
              (s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => handleStatusChange(s)}
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

        {/* Assign */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-neutral-200 text-neutral-500 hover:border-neutral-300 transition-colors">
              {assignedMember ? (
                <>
                  <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-600 text-[9px] font-bold flex items-center justify-center">
                    {assignedMember.initials}
                  </span>
                  {assignedMember.name.split(' ')[0]}
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3" /> Assign
                </>
              )}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <p className="px-2 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
              Assign to
            </p>
            <DropdownMenuSeparator />
            {TEAM_MEMBERS.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onClick={() => setAssignedTo(m.id)}
                className={cn(
                  'text-xs',
                  assignedTo === m.id && 'font-semibold',
                )}
              >
                <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 text-[9px] font-bold flex items-center justify-center mr-2">
                  {m.initials}
                </span>
                {m.name}
              </DropdownMenuItem>
            ))}
            {assignedTo && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setAssignedTo(null)}
                  className="text-xs text-neutral-400"
                >
                  Unassign
                </DropdownMenuItem>
              </>
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
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem
              onClick={handleCopyLink}
              className="text-xs gap-2"
            >
              <Link className="w-3.5 h-3.5" /> Copy conversation link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleRequestClose()}
              className="text-xs text-red-600 gap-2 focus:text-red-600"
            >
              <X className="w-3.5 h-3.5" /> Close conversation
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

      {/* ── Messages ── */}
      <div className="flex-1 overflow-auto px-5 py-5 flex flex-col gap-0 bg-neutral-50/40">
        {groups.map((group) => (
          <div key={group.dateLabel}>
            <DateSeparator label={group.dateLabel} />
            <div className="flex flex-col gap-3">
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── AI suggestion ──
          No "generating" state here: while the AI works there is no card at
          all, only the pulsing icon in the reply toolbar. The card appears
          once, already holding the finished suggestion. */}
      {AI_FEATURES_ENABLED && suggestion &&
        (suggestionStatus === 'idle' || suggestionStatus === 'sending') && (
          // O único elemento que aparece sem qualquer acção do vendedor — o
          // webhook gera em segundo plano e o Realtime empurra-o para aqui.
          <div className="mx-4 mb-2 flex-shrink-0 relative animate-fade-in motion-reduce:animate-none">
            <div className="absolute inset-0 rounded-2xl bg-primary-500/10 blur-sm" />
            <div className="relative p-3.5 bg-white border border-primary-200 rounded-2xl">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-500" />
                </div>
                <span className="text-xs font-semibold text-primary-600 flex-1">
                  AI follow-up suggestion
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-500 text-[10px] font-semibold">
                  {TECHNIQUE_LABELS[suggestion.type] ?? suggestion.type}
                </span>
                <span className="text-[10px] text-neutral-400">Click to edit</span>
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
                  "{editedSuggestion}"
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
        <input ref={fileInputRef} type="file" className="hidden" />
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
                  <Hash className="w-2.5 h-2.5" /> type / for templates
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
                <Hash className="w-3 h-3 text-neutral-400" />
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

          <Textarea
            ref={textareaRef}
            value={replyText}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                handleSendReply();
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
              {AI_FEATURES_ENABLED && <Button
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
                <Sparkles className="w-3.5 h-3.5" />
              </Button>}
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full text-neutral-400"
                title="Templates"
                onClick={openTemplates}
              >
                <Zap className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full text-neutral-400"
                title="Attach file"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-3.5 h-3.5" />
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
                <Smile className="w-3.5 h-3.5" />
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
                  <PenLine className="w-3 h-3" /> Reply
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
                  <FileText className="w-3 h-3" /> Note
                </button>
              </div>
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSending}
                size="sm"
                className={cn(
                  'rounded-full h-7 px-4 text-xs',
                  replyMode === 'note' &&
                     'bg-neutral-700 hover:bg-neutral-800 text-neutral-50',
                )}
              >
                {isSending
                  ? 'Sending…'
                  : replyMode === 'note'
                    ? 'Add note'
                    : 'Send'}
              </Button>
            </div>
          </div>
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

const MessageBubble: FC<{ message: Message }> = ({ message }) => {
  const isOut = message.direction === 'out';
  return (
    <div
      className={cn(
        'flex max-w-[72%]',
        // Uma mensagem recebida aparece sem o vendedor ter feito nada: entrar
        // em vez de surgir de repente é o que lhe diz que algo mudou.
        'animate-fade-in motion-reduce:animate-none',
        isOut
          ? 'self-end flex-col items-end'
          : 'self-start flex-col items-start',
      )}
    >
      <div
        className={cn(
          'px-4 py-2.5 text-sm leading-relaxed shadow-sm',
          isOut
            ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
            : 'bg-white text-neutral-800 rounded-2xl rounded-bl-md border border-neutral-100',
        )}
      >
        {message.content}
      </div>
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <span className="text-[10px] text-neutral-400" suppressHydrationWarning>
          {formatTime(message.timestamp)}
        </span>
        {AI_FEATURES_ENABLED && (
          <span className="flex items-center gap-0.5 text-[10px] text-primary-400 font-medium">
            <Sparkles className="w-2.5 h-2.5" /> VendAI
          </span>
        )}
        {isOut &&
          (message.read ? (
            <CheckCheck className="w-3 h-3 text-primary-400" />
          ) : (
            <Check className="w-3 h-3 text-neutral-300" />
          ))}
      </div>
    </div>
  );
};
