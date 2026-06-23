"use client";

import { FC, useState } from "react";
import { AlertTriangle, CalendarPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/shared/section-label";
import type { Conversation, FollowUp } from "@/types";

interface Note { id: string; text: string; createdAt: string; }

interface InboxDetailsPanelProps { conversation: Conversation | null; }

export const InboxDetailsPanel: FC<InboxDetailsPanelProps> = ({ conversation }) => {
  const [notes, setNotes]             = useState<Note[]>([]);
  const [noteText, setNoteText]       = useState("");
  const [noteSaved, setNoteSaved]     = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [followUps, setFollowUps]     = useState<FollowUp[]>(conversation?.follow_ups ?? []);

  const displayFollowUps = conversation ? followUps : [];

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const note: Note = {
      id: `n-${Date.now()}`,
      text: noteText.trim(),
      createdAt: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
    setNotes(prev => [note, ...prev]);
    setNoteText("");
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  };

  if (!conversation) {
    return (
      <aside className="w-[240px] flex-shrink-0 border-l border-zinc-200 bg-zinc-50 flex items-center justify-center">
        <p className="text-xs text-zinc-400 text-center px-4">Select a conversation<br />to see details</p>
      </aside>
    );
  }

  const { contact, product_interest } = conversation;

  return (
    <>
      <aside className="w-[240px] flex-shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col overflow-auto">
        <div className="h-[52px] px-4 flex items-center border-b border-zinc-200 flex-shrink-0">
          <span className="text-sm font-medium text-zinc-900">Details</span>
        </div>

        {/* Contact */}
        <div className="px-4 py-3 border-b border-zinc-200">
          <SectionLabel className="mb-2.5">Contact</SectionLabel>
          {([
            ["Name",          contact.name],
            ["Channel",       <span className="capitalize">{contact.platform}</span>],
            ["First contact", contact.first_contact],
            ["Status",        <StatusBadge status={contact.status} />],
          ] as [string, React.ReactNode][]).map(([k, v], i) => (
            <div key={i} className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] text-zinc-400">{k}</span>
              <span className="text-[11px] text-zinc-800 font-medium">{v}</span>
            </div>
          ))}
        </div>

        {/* Product */}
        {product_interest && (
          <div className="px-4 py-3 border-b border-zinc-200">
            <SectionLabel className="mb-2.5">Product interest</SectionLabel>
            {([
              ["Item",  product_interest.item],
              ["Price", product_interest.price],
              ["Stock", product_interest.stock !== null
                ? (
                  <span className={cn("flex items-center gap-1", product_interest.is_low_stock ? "text-red-500 font-semibold" : "text-zinc-800")}>
                    {product_interest.is_low_stock && <AlertTriangle className="w-3 h-3" />}
                    {product_interest.is_low_stock ? `${product_interest.stock} left` : `${product_interest.stock} in stock`}
                  </span>
                ) : "—"
              ],
            ] as [string, React.ReactNode][]).map(([k, v], i) => (
              <div key={i} className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-zinc-400">{k}</span>
                <span className="text-[11px] font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Follow-ups */}
        <div className="px-4 py-3 border-b border-zinc-200">
          <SectionLabel className="mb-2.5">Scheduled follow-ups</SectionLabel>
          {displayFollowUps.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[11px] text-zinc-400 text-center">No follow-ups scheduled</p>
              <Button
                variant="outline" size="sm"
                className="rounded-full h-7 px-3 text-xs gap-1.5 border-dashed text-zinc-500"
                onClick={() => setScheduleOpen(true)}
              >
                <CalendarPlus className="w-3 h-3" />
                Schedule follow-up
              </Button>
            </div>
          ) : (
            <>
              {displayFollowUps.map(fu => (
                <div key={fu.id} className="bg-white border border-zinc-200 rounded-lg p-2.5 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-semibold text-zinc-800">{fu.title}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 rounded-full font-semibold",
                        fu.status === "sent"      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                        fu.status === "scheduled" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                        "bg-zinc-100 text-zinc-500 hover:bg-zinc-100"
                      )}
                    >
                      {fu.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">"{fu.message}"</p>
                  <p className="text-[10px] text-zinc-300 mt-1">{fu.scheduled_for ?? fu.sent_at}</p>
                </div>
              ))}
              <Button
                variant="ghost" size="sm"
                className="w-full rounded-full h-7 text-xs gap-1.5 text-zinc-400 border border-dashed border-zinc-200 mt-1"
                onClick={() => setScheduleOpen(true)}
              >
                <CalendarPlus className="w-3 h-3" /> Add follow-up
              </Button>
            </>
          )}
        </div>

        {/* Internal notes */}
        <div className="px-4 py-3 flex-1">
          <SectionLabel className="mb-2.5">Internal notes</SectionLabel>

          {notes.length > 0 && (
            <div className="mb-3 space-y-2">
              {notes.map(note => (
                <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 relative group">
                  <p className="text-[11px] text-zinc-700 leading-relaxed">{note.text}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-zinc-400">{note.createdAt}</span>
                    <button
                      onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a private note…"
            rows={3}
            className="text-[11px] resize-none rounded-lg border-zinc-200 placeholder:text-zinc-300 bg-white focus-visible:ring-1 focus-visible:ring-amber-300"
          />

          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={!noteText.trim()}
              className="rounded-full h-7 px-4 text-xs flex-1"
            >
              Save note
            </Button>
            {noteSaved && (
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Saved
              </span>
            )}
          </div>
        </div>
      </aside>

      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSave={(fu) => {
          setFollowUps(prev => [fu, ...prev]);
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
  const [message, setMessage] = useState("");
  const [hours, setHours]     = useState("6");

  const handleSave = () => {
    if (!message.trim()) return;
    const fu: FollowUp = {
      id: `fu-${Date.now()}`,
      conversation_id: conversationId,
      contact_name: contactName,
      title: "Manual follow-up",
      message: message.trim(),
      status: "scheduled",
      type: "upsell",
      scheduled_for: `In ${hours}h`,
    };
    onSave(fu);
    setMessage("");
    setHours("6");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Schedule follow-up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1.5">Message</label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write the follow-up message…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1.5">Send in (hours)</label>
            <Input
              type="number"
              min={1}
              max={48}
              value={hours}
              onChange={e => setHours(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" className="rounded-full px-4" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="rounded-full px-4" onClick={handleSave} disabled={!message.trim()}>Schedule</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  interested: "bg-indigo-50 text-indigo-600 border-indigo-200",
  converted:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost:       "bg-zinc-100 text-zinc-500 border-zinc-200",
  new:        "bg-sky-50 text-sky-600 border-sky-200",
};

const StatusBadge: FC<{ status: string }> = ({ status }) => (
  <span className={cn(
    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
    STATUS_BADGE[status] ?? "bg-zinc-100 text-zinc-500"
  )}>
    {status}
  </span>
);
