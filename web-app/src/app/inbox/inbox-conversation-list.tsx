"use client";

import { FC, useState, useEffect, useRef } from "react";

import { Settings, Search, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Conversation, ConversationStatus } from "@/types";
import { Avatar } from "@/components/shared/avatar";
import { PlatformBadge } from "@/components/shared/platform-badge";
import { SectionLabel } from "@/components/shared/section-label";
import { useConversationList } from "./inbox-conversation-list.hook";

interface InboxConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusOverrides?: Record<string, ConversationStatus>;
}

const MAX_RECENT = 5;

export const InboxConversationList: FC<InboxConversationListProps> = ({ selectedId, onSelect, statusOverrides = {} }) => {
  const { filtered, conversations: allConversations, activeTab, isLoading, setActiveTab } =
    useConversationList(selectedId, statusOverrides);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    setRecentIds(prev => [selectedId, ...prev.filter(id => id !== selectedId)].slice(0, MAX_RECENT));
  }, [selectedId]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearchQuery("");
  }, [searchOpen]);

  const tabCounts: Record<ConversationStatus, number> = {
    open:     allConversations.filter(c => c.status === "open").length,
    pending:  allConversations.filter(c => c.status === "pending").length,
    resolved: allConversations.filter(c => c.status === "resolved").length,
  };
  const tabUnread: Record<ConversationStatus, number> = {
    open:     allConversations.filter(c => c.status === "open"     && c.unread).length,
    pending:  allConversations.filter(c => c.status === "pending"  && c.unread).length,
    resolved: allConversations.filter(c => c.status === "resolved" && c.unread).length,
  };

  const recentConversations = recentIds
    .map(id => allConversations.find(c => c.id === id))
    .filter(Boolean) as Conversation[];

  const searchResults = searchQuery.trim()
    ? allConversations.filter(c =>
        c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectFromSearch = (id: string) => { onSelect(id); setSearchOpen(false); };

  return (
    <>
      <div className="w-[260px] flex-shrink-0 border-r border-zinc-200 flex flex-col bg-white">
        {/* Header */}
        <div className="h-[52px] px-4 flex items-center justify-between border-b border-zinc-200 flex-shrink-0">
          <span className="text-sm font-medium text-zinc-900">All messages</span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={() => setSearchOpen(true)}>
              <Search className="w-3.5 h-3.5 text-zinc-400" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full">
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
            </Button>
          </div>
        </div>

        {/* Tabs with counts */}
        <div className="px-3 py-2 flex-shrink-0">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ConversationStatus)}>
            <TabsList className="h-7 rounded-full bg-zinc-100 p-0.5 gap-0.5 w-full">
              {(["open", "pending", "resolved"] as ConversationStatus[]).map(tab => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2 py-1 rounded-full capitalize h-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  {tab}
                  {tabCounts[tab] > 0 && (
                    <span className={cn(
                      "text-[9px] font-bold px-1 py-0 rounded-full leading-4 min-w-[14px] text-center",
                      activeTab === tab
                        ? "bg-white/20 text-white"
                        : tabUnread[tab] > 0
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-zinc-200 text-zinc-500"
                    )}>
                      {tabCounts[tab]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-2.5 p-3 border-b border-zinc-50 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-zinc-100 rounded-full w-24" />
                    <div className="h-2.5 bg-zinc-100 rounded-full w-36" />
                  </div>
                </div>
              ))
            : filtered.map(conv => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  isActive={selectedId === conv.id}
                  onClick={() => onSelect(conv.id)}
                />
              ))}
          {!isLoading && filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-zinc-400">No conversations found</div>
          )}
        </div>
      </div>

      {/* Search modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="p-0 gap-0 max-w-md top-[20%] translate-y-0 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100">
            <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="border-0 shadow-none focus-visible:ring-0 text-sm placeholder:text-zinc-400 h-7 px-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-zinc-400 hover:text-zinc-600 flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-auto">
            {!searchQuery.trim() && (
              <>
                <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <SectionLabel>Recent</SectionLabel>
                </div>
                {recentConversations.length === 0 && (
                  <p className="px-4 py-4 text-xs text-zinc-400 text-center">No recent views yet</p>
                )}
                {recentConversations.map(conv => (
                  <SearchResultRow key={conv.id} conversation={conv} isActive={selectedId === conv.id} onClick={() => handleSelectFromSearch(conv.id)} />
                ))}
              </>
            )}
            {searchQuery.trim() && (
              <>
                {searchResults.length === 0 && (
                  <p className="px-4 py-6 text-xs text-zinc-400 text-center">No results for "{searchQuery}"</p>
                )}
                {searchResults.map(conv => (
                  <SearchResultRow key={conv.id} conversation={conv} isActive={selectedId === conv.id} onClick={() => handleSelectFromSearch(conv.id)} query={searchQuery} />
                ))}
              </>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-zinc-100 flex items-center gap-3">
            <span className="text-[10px] text-zinc-400"><kbd className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[9px]">↵</kbd> to open</span>
            <span className="text-[10px] text-zinc-400"><kbd className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[9px]">esc</kbd> to close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Conversation row ─────────────────────────────────────────────────────────

const ConversationRow: FC<{
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}> = ({ conversation, isActive, onClick }) => {
  const { contact, lastMessage, lastMessageAt, unread, aiScheduled } = conversation;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-3 py-2.5 border-b border-zinc-50 text-left transition-colors",
        isActive ? "bg-zinc-50" : "hover:bg-zinc-50/60"
      )}
    >
      <Avatar initials={contact.initials} bg={contact.avatarBg} color={contact.avatarColor} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className={cn("text-xs truncate", unread ? "font-bold text-zinc-900" : "font-semibold text-zinc-800")}>{contact.name}</span>
          <span className="text-[10px] text-zinc-400 ml-1 flex-shrink-0">{lastMessageAt}</span>
        </div>
        <p className={cn("text-[11px] truncate", unread ? "text-zinc-700 font-medium" : "text-zinc-400")}>{lastMessage}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <PlatformBadge platform={contact.platform} />
          {aiScheduled && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full h-4 bg-violet-50 text-violet-600 border border-violet-200/60 hover:bg-violet-50">
              AI scheduled
            </Badge>
          )}
          {unread && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-auto flex-shrink-0" />}
        </div>
      </div>
    </button>
  );
};

// ─── Search result row ────────────────────────────────────────────────────────

const SearchResultRow: FC<{
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  query?: string;
}> = ({ conversation, isActive, onClick, query }) => {
  const { contact, lastMessage, lastMessageAt } = conversation;

  const highlight = (text: string) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-indigo-100 text-indigo-700 rounded-sm not-italic">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
        isActive ? "bg-zinc-50" : "hover:bg-zinc-50"
      )}
    >
      <Avatar initials={contact.initials} bg={contact.avatarBg} color={contact.avatarColor} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-zinc-900 truncate">{highlight(contact.name)}</span>
          <span className="text-[10px] text-zinc-400 ml-2 flex-shrink-0">{lastMessageAt}</span>
        </div>
        <p className="text-[11px] text-zinc-400 truncate mt-0.5">{highlight(lastMessage)}</p>
      </div>
      <PlatformBadge platform={contact.platform} />
    </button>
  );
};
