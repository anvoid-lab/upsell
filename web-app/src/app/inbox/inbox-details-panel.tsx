'use client';

import { FC, useEffect, useState } from 'react';
import { IconAlertTriangle, IconCalendarPlus } from '@icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDate, formatRelative } from '@/lib/format';
import { SectionLabel } from '@/components/shared/section-label';
import type { Conversation, ConversationNote, FollowUp } from '@/types';

interface InboxDetailsPanelProps {
  conversation: Conversation | null;
  notes: ConversationNote[];
  isAddingNote: boolean;
  onAddNote: (content: string) => Promise<boolean>;
}

export const InboxDetailsPanel: FC<InboxDetailsPanelProps> = ({
  conversation,
  notes,
  isAddingNote,
  onAddNote,
}) => {
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // Só os follow-ups criados nesta sessão, por conversa. Os que vêm da BD são
  // lidos das props — copiá-los para estado inicial deixava-os presos ao
  // primeiro render, quando `conversation` ainda é null, e nunca apareciam.
  const [addedFollowUps, setAddedFollowUps] = useState<
    Record<string, FollowUp[]>
  >({});

  const displayFollowUps = conversation
    ? [
        ...(addedFollowUps[conversation.id] ?? []),
        ...(conversation.follow_ups ?? []),
      ]
    : [];

  useEffect(() => {
    setNoteText('');
    setNoteSaved(false);
    setNoteError(null);
  }, [conversation?.id]);

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setNoteError(null);
    const saved = await onAddNote(noteText);
    if (!saved) {
      setNoteError('Note could not be saved. Your text was preserved.');
      return;
    }
    setNoteText('');
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  };

  if (!conversation) {
    return (
      <aside className="w-full flex-shrink-0 border-l border-neutral-200 bg-neutral-50 flex items-center justify-center">
        <p className="text-[13px] text-neutral-400 text-center px-4">
          Select a conversation
          <br />
          to see details
        </p>
      </aside>
    );
  }

  const { contact, product_interest } = conversation;

  return (
    <>
      <aside className="w-full flex-shrink-0 border-l border-neutral-200 bg-neutral-50 flex flex-col overflow-auto">
        <div className="h-[52px] px-4 flex items-center border-b border-neutral-200 flex-shrink-0">
          <span className="text-sm font-medium text-neutral-900">Details</span>
        </div>

        {/* Contact */}
        <div className="px-4 py-3 border-b border-neutral-200">
          <SectionLabel className="mb-2.5">Contact</SectionLabel>
          {(
            [
              ['Name', contact.name],
              [
                'Channel',
                <span key="channel" className="capitalize">
                  {contact.platform}
                </span>,
              ],
              [
                'First contact',
                <span key="first-contact" suppressHydrationWarning>
                  {formatDate(contact.first_contact)}
                </span>,
              ],
              ['Status', <StatusBadge key="status" status={contact.status} />],
            ] as [string, React.ReactNode][]
          ).map(([k, v], i) => (
            <div key={i} className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-neutral-400">{k}</span>
              <span className="text-xs text-neutral-800 font-medium">{v}</span>
            </div>
          ))}
        </div>

        {/* Product */}
        {product_interest && (
          <div className="px-4 py-3 border-b border-neutral-200">
            <SectionLabel className="mb-2.5">Product interest</SectionLabel>
            {(
              [
                ['Item', product_interest.item],
                ['Price', product_interest.price],
                [
                  'Stock',
                  product_interest.stock !== null ? (
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        product_interest.is_low_stock
                          ? 'text-red-500 font-semibold'
                          : 'text-neutral-800',
                      )}
                    >
                      {product_interest.is_low_stock && (
                        <IconAlertTriangle className="w-3 h-3" />
                      )}
                      {product_interest.is_low_stock
                        ? `${product_interest.stock} left`
                        : `${product_interest.stock} in stock`}
                    </span>
                  ) : (
                    '—'
                  ),
                ],
              ] as [string, React.ReactNode][]
            ).map(([k, v], i) => (
              <div key={i} className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-neutral-400">{k}</span>
                <span className="text-xs font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Follow-ups */}
        <div className="px-4 py-3 border-b border-neutral-200">
          <SectionLabel className="mb-2.5">Scheduled follow-ups</SectionLabel>
          {displayFollowUps.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-xs text-neutral-400 text-center">
                No follow-ups scheduled
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-7 px-3 text-xs gap-1.5 border-dashed text-neutral-500"
                onClick={() => setScheduleOpen(true)}
              >
                <IconCalendarPlus className="w-3 h-3" />
                Schedule follow-up
              </Button>
            </div>
          ) : (
            <>
              {displayFollowUps.map((fu) => (
                <div
                  key={fu.id}
                  className="bg-white border border-neutral-200 rounded-lg p-2.5 mb-2"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-neutral-800">
                      {fu.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] px-1.5 py-0 h-4 rounded-full font-semibold',
                        fu.status === 'sent'
                          ? 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100'
                          : fu.status === 'scheduled'
                            ? 'bg-primary-100 text-primary-700 hover:bg-primary-100'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
                      )}
                    >
                      {fu.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    &ldquo;{fu.message}&rdquo;
                  </p>
                  <p
                    className="text-[11px] text-neutral-300 mt-1"
                    suppressHydrationWarning
                  >
                    {fu.sent_at
                      ? `sent ${formatRelative(fu.sent_at)}`
                      : fu.scheduled_for
                        ? formatRelative(fu.scheduled_for)
                        : null}
                  </p>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-full h-7 text-xs gap-1.5 text-neutral-400 border border-dashed border-neutral-200 mt-1"
                onClick={() => setScheduleOpen(true)}
              >
                <IconCalendarPlus className="w-3 h-3" /> Add follow-up
              </Button>
            </>
          )}
        </div>

        {/* Internal notes */}
        <div className="px-4 py-3 flex-1">
          <SectionLabel className="mb-2.5">Internal notes</SectionLabel>

          {notes.length > 0 && (
            <div className="mb-3 space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 relative group"
                >
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    {note.content}
                  </p>
                  <p
                    className="mt-1 text-[10px] text-neutral-400"
                    suppressHydrationWarning
                  >
                    You ·{' '}
                    {note.id.startsWith('pending-note:')
                      ? 'Saving…'
                      : formatRelative(note.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a private note…"
            rows={3}
            className="text-xs resize-none rounded-lg border-neutral-200 placeholder:text-neutral-300 bg-white focus-visible:ring-1 focus-visible:ring-primary-300"
          />

          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => void handleSaveNote()}
              disabled={!noteText.trim() || isAddingNote}
              className="rounded-full h-7 px-4 text-xs flex-1"
            >
              {isAddingNote ? 'Saving…' : 'Save note'}
            </Button>
            {noteSaved && (
              <span className="text-xs text-primary-600 font-medium flex items-center gap-1 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
                Saved
              </span>
            )}
          </div>
          {noteError && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {noteError}
            </p>
          )}
        </div>
      </aside>

      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSave={(fu) => {
          setAddedFollowUps((prev) => ({
            ...prev,
            [fu.conversation_id]: [fu, ...(prev[fu.conversation_id] ?? [])],
          }));
          setScheduleOpen(false);
        }}
        conversationId={conversation.id}
        contactName={contact.name}
      />
    </>
  );
};

// ─── Schedule dialog ──────────────────────────────────────────────────────────

const ScheduleDialog: FC<{
  open: boolean;
  onClose: () => void;
  onSave: (fu: FollowUp) => void;
  conversationId: string;
  contactName: string;
}> = ({ open, onClose, onSave, conversationId, contactName }) => {
  const [message, setMessage] = useState('');
  const [hours, setHours] = useState('6');

  const handleSave = () => {
    if (!message.trim()) return;
    const fu: FollowUp = {
      id: `fu-${Date.now()}`,
      conversation_id: conversationId,
      contact_name: contactName,
      title: 'Manual follow-up',
      message: message.trim(),
      status: 'scheduled',
      type: 'upsell',
      scheduled_for: new Date(Date.now() + Number(hours) * 60 * 60 * 1000),
    };
    onSave(fu);
    setMessage('');
    setHours('6');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Schedule follow-up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1.5">
              Message
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the follow-up message…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1.5">
              Send in (hours)
            </label>
            <Input
              type="number"
              min={1}
              max={48}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-full px-4"
              onClick={handleSave}
              disabled={!message.trim()}
            >
              Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  interested: 'bg-primary-50 text-primary-600 border-primary-200',
  converted: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  lost: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  new: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

const StatusBadge: FC<{ status: string }> = ({ status }) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
      STATUS_BADGE[status] ?? 'bg-neutral-100 text-neutral-500',
    )}
  >
    {status}
  </span>
);
