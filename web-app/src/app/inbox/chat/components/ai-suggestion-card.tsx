import { useEffect, useState } from 'react';
import { IconSparkles } from '@icons';
import type { AISuggestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TECHNIQUE_LABELS } from '../chat.utils';

export type SuggestionStatus = 'idle' | 'sending' | 'scheduled' | 'dismissed';

type AISuggestionCardProps = {
  suggestion: AISuggestion | null;
  status: SuggestionStatus;
  onSend: (text?: string) => void;
  onSchedule: (hours: number) => void;
  onDismiss: () => void;
};

export function AISuggestionCard({ suggestion, status, onSend, onSchedule, onDismiss }: AISuggestionCardProps) {
  const [editedMessage, setEditedMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => { setEditedMessage(suggestion?.message ?? ''); setIsEditing(false); }, [suggestion]);

  if (status === 'scheduled') return <div className="mx-4 mb-2 flex flex-shrink-0 items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700"><span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-500" />Follow-up scheduled — VendAI will send it automatically</div>;
  if (!suggestion || (status !== 'idle' && status !== 'sending')) return null;

  return <div className="relative mx-4 mb-2 flex-shrink-0 animate-fade-in motion-reduce:animate-none">
    <div className="absolute inset-0 rounded-2xl bg-primary-500/10 blur-sm" />
    <div className="relative rounded-2xl border border-primary-200 bg-white p-3.5">
      <div className="mb-2 flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100"><IconSparkles className="h-3 w-3 text-primary-500" /></div><span className="flex-1 text-xs font-semibold text-primary-600">AI follow-up suggestion</span><span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-500">{TECHNIQUE_LABELS[suggestion.type] ?? suggestion.type}</span><span className="text-[10px] text-neutral-400">Click to edit</span></div>
      {isEditing ? <Textarea value={editedMessage} onChange={(event) => setEditedMessage(event.target.value)} autoFocus rows={2} className="mb-1.5 resize-none rounded-lg border border-primary-200 bg-primary-50/30 p-2 text-xs focus-visible:ring-1 focus-visible:ring-primary-400" /> : <p onClick={() => setIsEditing(true)} className="mb-1.5 cursor-text pl-0.5 text-xs leading-relaxed text-neutral-600 transition-colors hover:text-neutral-800">&ldquo;{editedMessage}&rdquo;</p>}
      {suggestion.rationale && <p className="pl-0.5 text-[11px] leading-relaxed text-neutral-400">{suggestion.rationale}</p>}
      <div className="mt-3 flex items-center gap-2"><Button onClick={() => onSend(editedMessage !== suggestion.message ? editedMessage : undefined)} disabled={status === 'sending'} size="sm" className="h-7 rounded-full px-3 text-xs">Send now</Button><Button onClick={() => onSchedule(6)} variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs">Schedule 6h</Button><Button onClick={onDismiss} variant="ghost" size="sm" className="h-7 rounded-full px-3 text-xs text-neutral-400">Dismiss</Button></div>
    </div>
  </div>;
}
