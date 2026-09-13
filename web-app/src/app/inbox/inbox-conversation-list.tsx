'use client';

import { AI_FEATURES_ENABLED } from '@/lib/ai-features';

import { FC, useState, useEffect, useRef } from 'react';

import {
  IconArrowUpRight,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconSearch,
  IconUsers,
  IconX,
} from '@icons';
import { cn } from '@/lib/utils';
import { formatListTimestamp } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import type { Conversation, ConversationStatus } from '@/types';
import { PlatformBadge } from '@/components/shared/platform-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { SectionLabel } from '@/components/shared/section-label';
import { STATUS_DOT } from '@/styles/design-tokens';
import { useConversationList } from './inbox-conversation-list.hook';
import type { ConversationListFilter } from './inbox-conversation-list.hook';

interface InboxConversationListProps {
  onConnect?: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusOverrides?: Record<string, ConversationStatus>;
  conversations: Conversation[];
}

const MAX_RECENT = 5;

const getLatestMessage = (conversation: Conversation) =>
  [...conversation.messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0];

export const InboxConversationList: FC<InboxConversationListProps> = ({
  onConnect,
  selectedId,
  onSelect,
  statusOverrides = {},
  conversations,
}) => {
  const {
    filtered,
    conversations: allConversations,
    activeTab,
    isLoading,
    setActiveTab,
  } = useConversationList(selectedId, statusOverrides, conversations);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [unrepliedOnly, setUnrepliedOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    setRecentIds((prev) =>
      [selectedId, ...prev.filter((id) => id !== selectedId)].slice(
        0,
        MAX_RECENT,
      ),
    );
  }, [selectedId]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearchQuery('');
  }, [searchOpen]);

  const visibleConversations = unrepliedOnly
    ? filtered.filter((conversation) => {
        const latestMessage = getLatestMessage(conversation);
        return latestMessage
          ? latestMessage.direction === 'in'
          : conversation.unread;
      })
    : filtered;

  const filterLabels: Record<ConversationListFilter, string> = {
    all: 'All',
    open: 'Open',
    pending: 'Pending',
    resolved: 'Resolved',
  };

  const recentConversations = recentIds
    .map((id) => allConversations.find((c) => c.id === id))
    .filter(Boolean) as Conversation[];

  const searchResults = searchQuery.trim()
    ? allConversations.filter(
        (c) =>
          c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.last_message.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const handleSelectFromSearch = (id: string) => {
    onSelect(id);
    setSearchOpen(false);
  };

  return (
    <>
      <div className="w-[25%] flex-shrink-0 border-r border-neutral-200 flex flex-col bg-white">
        {/* Header */}
        <div className="h-[52px] px-4 flex items-center justify-between border-b border-neutral-200 flex-shrink-0">
          <div className="h-full flex items-center">
            <span className="relative flex h-full items-center px-1 text-[17px] font-semibold text-primary-600 after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-t-full after:bg-primary-600">
              Chats
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-full"
              onClick={() => setSearchOpen(true)}
            >
              <IconSearch className="w-5 h-5 text-neutral-700" />
            </Button>
            {onConnect && (
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full"
                aria-label="Manage channel connection"
                title="Manage channel connection"
                onClick={onConnect}
              >
                <IconUsers className="w-5 h-5 text-neutral-700" />
              </Button>
            )}
          </div>
        </div>
        {/* Filters */}
        <div className="h-[58px] px-4 flex items-center justify-between gap-3 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-2 text-sm font-medium gap-1.5"
              >
                {filterLabels[activeTab]}, Newest
                <IconChevronDown className="w-4 h-4 text-neutral-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[150px]">
              {(Object.keys(filterLabels) as ConversationListFilter[]).map(
                (filter) => (
                  <DropdownMenuItem
                    key={filter}
                    onClick={() => setActiveTab(filter)}
                    className="flex justify-between"
                  >
                    {filterLabels[filter]}
                    {activeTab === filter && <IconCheck className="w-4 h-4" />}
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <Switch
              checked={unrepliedOnly}
              onCheckedChange={setUnrepliedOnly}
              aria-label="Show unreplied conversations only"
            />
            Unreplied
          </label>
        </div>
        {/* List */}
        <div className="">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-5 py-3">
                  <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                </div>
              ))
            : visibleConversations.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  isActive={selectedId === conv.id}
                  onClick={() => onSelect(conv.id)}
                />
              ))}
          {!isLoading && visibleConversations.length === 0 && (
            <div className="p-6 text-center text-[13px] text-neutral-400">
              No conversations found
            </div>
          )}
        </div>
      </div>

      {/* Search modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="p-0 gap-0 max-w-md top-[20%] translate-y-0 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-neutral-100">
            <IconSearch className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="border-0 shadow-none focus-visible:ring-0 text-sm placeholder:text-neutral-400 h-7 px-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-neutral-600 flex-shrink-0"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-auto">
            {!searchQuery.trim() && (
              <>
                <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                  <IconClock className="w-3 h-3 text-neutral-400" />
                  <SectionLabel>Recent</SectionLabel>
                </div>
                {recentConversations.length === 0 && (
                  <p className="px-4 py-4 text-xs text-neutral-400 text-center">
                    No recent views yet
                  </p>
                )}
                {recentConversations.map((conv) => (
                  <SearchResultRow
                    key={conv.id}
                    conversation={conv}
                    isActive={selectedId === conv.id}
                    onClick={() => handleSelectFromSearch(conv.id)}
                  />
                ))}
              </>
            )}
            {searchQuery.trim() && (
              <>
                {searchResults.length === 0 && (
                  <p className="px-4 py-6 text-xs text-neutral-400 text-center">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
                {searchResults.map((conv) => (
                  <SearchResultRow
                    key={conv.id}
                    conversation={conv}
                    isActive={selectedId === conv.id}
                    onClick={() => handleSelectFromSearch(conv.id)}
                    query={searchQuery}
                  />
                ))}
              </>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-neutral-100 flex items-center gap-3">
            <span className="text-[10px] text-neutral-400">
              <kbd className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-[9px]">
                ↵
              </kbd>{' '}
              to open
            </span>
            <span className="text-[10px] text-neutral-400">
              <kbd className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-[9px]">
                esc
              </kbd>{' '}
              to close
            </span>
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
  const { contact, last_message, last_message_at, unread } = conversation;
  const lastMessageWasSent =
    getLatestMessage(conversation)?.direction === 'out';

  return (
    <div className="px-3">
      <button
        onClick={onClick}
        className={cn(
          'mb-2 flex items-start gap-3 rounded-xl w-full px-3 py-3 text-left transition-colors',
          isActive ? 'bg-primary-50' : 'hover:bg-neutral-50',
        )}
      >
        <UserAvatar
          src={contact.avatar_url}
          alt={contact.name}
          initials={contact.initials}
          background={contact.avatar_bg}
          color={contact.avatar_color}
          platform={contact.platform}
          badgeClassName="absolute -right-1 -bottom-1 h-5 w-5 justify-center rounded-full border-2 border-white bg-white p-0 shadow-sm"
        />
        <div className="flex-1 min-w-4 w-full">
          <div className="flex justify-between items-baseline mb-1">
            <span
              className={cn(
                'text-[15px] text-nowrap text-ellipsis',
                unread
                  ? 'font-bold text-neutral-900'
                  : 'font-semibold text-neutral-800',
              )}
            >
              {contact.name}
            </span>
            <span
              className="text-xs text-neutral-500 ml-2 flex-shrink-0"
              suppressHydrationWarning
            >
              {formatListTimestamp(last_message_at)}
            </span>
          </div>
          <p
            className={cn(
              'truncate line-clamp-2',
              unread ? 'text-neutral-700 font-medium' : 'text-neutral-400',
            )}
          >
            {lastMessageWasSent && (
              <IconArrowUpRight className="inline-block w-4 h-4 mr-1 text-primary-500 align-[-3px]" />
            )}
            {last_message}
          </p>

          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge
              variant="secondary"
              className="h-5 rounded-md border border-neutral-200 bg-white px-1.5 text-[11px] font-medium text-neutral-600 hover:bg-white"
            >
              {conversation.status === 'open'
                ? 'Open'
                : conversation.status === 'pending'
                  ? 'Pending'
                  : 'Resolved'}
            </Badge>
            {AI_FEATURES_ENABLED && (
              <Badge
                variant="secondary"
                className="text-[11px] px-2 py-0 rounded-full h-4 bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-50"
              >
                AI scheduled
              </Badge>
            )}
            {conversation.status === 'resolved' ? (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
            ) : unread ? (
              // Animate only the unread dot so reordering does not flash the list.
              <div
                className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT.open} ml-auto flex-shrink-0 animate-fade-in motion-reduce:animate-none`}
              />
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
};

// ─── Search result row ────────────────────────────────────────────────────────────

const SearchResultRow: FC<{
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  query?: string;
}> = ({ conversation, isActive, onClick, query }) => {
  const { contact, last_message, last_message_at } = conversation;

  const highlight = (text: string) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary-100 text-primary-700 rounded-sm not-italic">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50',
      )}
    >
      <UserAvatar
        src={contact.avatar_url}
        alt={contact.name}
        initials={contact.initials}
        background={contact.avatar_bg}
        color={contact.avatar_color}
        platform={contact.platform}
        size="sm"
        showPlatformBadge={false}
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="text-[13px] font-semibold text-neutral-900 truncate">
            {highlight(contact.name)}
          </span>
          <span
            className="text-[11px] text-neutral-400 ml-2 flex-shrink-0"
            suppressHydrationWarning
          >
            {formatListTimestamp(last_message_at)}
          </span>
        </div>
        <p className="text-xs text-neutral-400 truncate mt-0.5">
          {highlight(last_message)}
        </p>
      </div>
      <PlatformBadge platform={contact.platform} />
    </button>
  );
};
