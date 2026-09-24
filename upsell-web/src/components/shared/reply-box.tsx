import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  IconBolt,
  IconFileText,
  IconHash,
  IconMoodSmile,
  IconPaperclip,
  IconPencil,
  IconSparkles,
  IconX,
} from '@icons';
import type { Contact } from '../../core/contracts';
import { AI_FEATURES_ENABLED } from '@/lib/ai-features';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SectionLabel } from '@/components/shared/section-label';
import type { SelectedAttachment } from '@/app/inbox/chat/chat.types';
import { EMOJIS, TEMPLATES } from '@/app/inbox/chat/chat-mock';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/app/inbox/chat/chat.utils';

export type ReplyMode = 'reply' | 'note';

type ReplyBoxProps = {
  contact: Contact;
  value: string;
  mode: ReplyMode;
  attachments: SelectedAttachment[];
  isSending: boolean;
  isAddingNote: boolean;
  noteError?: string | null;
  isSuggestionLoading?: boolean;
  onChange: (value: string) => void;
  onModeChange: (mode: ReplyMode) => void;
  onAddAttachments: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: () => void;
  onGenerateSuggestion?: () => void;
};

export function ReplyBox({
  contact,
  value,
  mode,
  attachments,
  isSending,
  isAddingNote,
  noteError,
  isSuggestionLoading = false,
  onChange,
  onModeChange,
  onAddAttachments,
  onRemoveAttachment,
  onSubmit,
  onGenerateSuggestion,
}: ReplyBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const templateQuery = value.startsWith('/')
    ? value.slice(1).toLowerCase()
    : '';
  const templates = useMemo(
    () =>
      TEMPLATES.filter(
        (template) =>
          !templateQuery ||
          template.label.toLowerCase().includes(templateQuery) ||
          template.text.toLowerCase().includes(templateQuery),
      ),
    [templateQuery],
  );
  const focusTextarea = () => setTimeout(() => textareaRef.current?.focus(), 0);
  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    onChange(nextValue);
    setShowTemplates(nextValue.startsWith('/'));
  };
  const selectTemplate = (text: string) => {
    onChange(text);
    setShowTemplates(false);
    focusTextarea();
  };
  const openTemplates = () => {
    onChange('/');
    setShowTemplates(true);
    focusTextarea();
  };
  const selectEmoji = (emoji: string) => {
    onChange(value + emoji);
    setShowEmojiPicker(false);
    focusTextarea();
  };

  return (
    <div className="mx-4 mb-4 flex-shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) onAddAttachments(event.target.files);
          event.target.value = '';
        }}
      />
      <div
        className={cn(
          'overflow-hidden rounded-2xl border bg-white shadow-sm',
          mode === 'note' ? 'border-neutral-300' : 'border-neutral-200',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 border-b px-3 py-1.5',
            mode === 'note'
              ? 'border-neutral-200 bg-neutral-50/50'
              : 'border-neutral-100',
          )}
        >
          {mode === 'reply' ? (
            <>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  PLATFORM_COLORS[contact.platform],
                )}
              >
                {PLATFORM_LABELS[contact.platform]}
              </span>
              <span className="text-[10px] text-neutral-400">
                → {contact.name}
              </span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-neutral-300">
                <IconHash className="h-2.5 w-2.5" /> type / for templates
              </span>
            </>
          ) : (
            <span className="text-[10px] font-medium text-neutral-700">
              Internal note · not visible to customer
            </span>
          )}
        </div>

        {showTemplates && templates.length > 0 && (
          <div className="border-b border-neutral-100">
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <IconHash className="h-3 w-3 text-neutral-400" />
              <SectionLabel>Templates</SectionLabel>
            </div>
            {templates.map((template) => (
              <button
                key={template.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectTemplate(template.text);
                }}
                className="flex w-full flex-col border-t border-neutral-50 px-3 py-2 text-left transition-colors hover:bg-neutral-50"
              >
                <span className="text-xs font-medium text-neutral-800">
                  {template.label}
                </span>
                <span className="truncate text-[11px] text-neutral-400">
                  {template.text}
                </span>
              </button>
            ))}
          </div>
        )}

        {showEmojiPicker && (
          <div className="flex flex-wrap gap-1 border-b border-neutral-100 px-3 py-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectEmoji(emoji);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors hover:bg-neutral-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {mode === 'reply' && attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-3 py-2">
            {attachments.map((item) => (
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
                  // Blob URLs are local previews and cannot be rendered by Next Image.
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
                  onClick={() => onRemoveAttachment(item.id)}
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
          value={value}
          onChange={handleTextChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey))
              onSubmit();
          }}
          onBlur={() => setTimeout(() => setShowTemplates(false), 150)}
          placeholder={
            mode === 'reply'
              ? 'Type a message… (⌘↵ to send)'
              : 'Write an internal note…'
          }
          rows={2}
          className={cn(
            'resize-none rounded-none border-0 px-3 py-2 text-sm shadow-none focus-visible:ring-0',
            mode === 'note'
              ? 'bg-neutral-50/30 placeholder:text-neutral-300'
              : 'placeholder:text-neutral-300',
          )}
        />

        <div
          className={cn(
            'flex items-center justify-between border-t px-3 py-2',
            mode === 'note'
              ? 'border-neutral-200 bg-neutral-50/30'
              : 'border-neutral-100',
          )}
        >
          <div className="flex gap-0.5">
            {AI_FEATURES_ENABLED && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-full text-primary-500',
                  isSuggestionLoading
                    ? 'animate-pulse disabled:opacity-100 motion-reduce:animate-none'
                    : 'hover:bg-primary-50',
                )}
                title={
                  isSuggestionLoading
                    ? 'Generating suggestion…'
                    : 'Generate AI suggestion'
                }
                onClick={onGenerateSuggestion}
                disabled
              >
                <IconSparkles className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-neutral-400"
              title="Templates"
              onClick={openTemplates}
            >
              <IconBolt className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-neutral-400"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconPaperclip className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded-full',
                showEmojiPicker
                  ? 'bg-primary-50 text-primary-500'
                  : 'text-neutral-400',
              )}
              title="Emoji"
              onClick={() => setShowEmojiPicker((visible) => !visible)}
            >
              <IconMoodSmile className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="mr-1 flex items-center gap-0.5 rounded-full bg-neutral-100 p-0.5">
              <button
                onClick={() => onModeChange('reply')}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                  mode === 'reply'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600',
                )}
              >
                <IconPencil className="h-3 w-3" /> Reply
              </button>
              <button
                onClick={() => onModeChange('note')}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                  mode === 'note'
                    ? 'bg-neutral-700 text-neutral-50 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600',
                )}
              >
                <IconFileText className="h-3 w-3" /> Note
              </button>
            </div>
            <Button
              onClick={onSubmit}
              disabled={
                (mode === 'reply'
                  ? !value.trim() && attachments.length === 0
                  : !value.trim()) ||
                isSending ||
                isAddingNote
              }
              size="sm"
              className={cn(
                'h-7 rounded-full px-4 text-xs',
                mode === 'note' &&
                  'bg-neutral-700 text-neutral-50 hover:bg-neutral-800',
              )}
            >
              {isAddingNote
                ? 'Saving…'
                : isSending
                  ? 'Sending…'
                  : mode === 'note'
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
  );
}
