import { IconChevronDown, IconDots, IconLink, IconX } from '@icons';
import type { Contact, ConversationStatus } from '../../../../core/contracts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/shared/user-avatar';
import { cn } from '@/lib/utils';
import { STATUS_DOT, STATUS_LABELS, STATUS_STYLES } from '../chat.utils';

type ChatHeaderProps = {
  contact: Contact;
  status: ConversationStatus;
  isUpdatingStatus: boolean;
  onStatusChange: (status: ConversationStatus) => void;
  onCopyLink: () => void;
  onClose: () => void;
};

export function ChatHeader({
  contact,
  status,
  isUpdatingStatus,
  onStatusChange,
  onCopyLink,
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="flex h-[52px] flex-shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-4">
      <UserAvatar
        initials={contact.initials}
        background={contact.avatar_bg}
        color={contact.avatar_color}
        src={contact.avatar_url}
        alt={contact.name}
        platform={contact.platform}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-none text-neutral-900">
          {contact.name}
        </p>
        <p className="mt-0.5 text-[10px] capitalize text-neutral-400">
          {contact.platform} · Active now
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isUpdatingStatus}
            className={cn(
              'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
              STATUS_STYLES[status],
            )}
          >
            {STATUS_LABELS[status]}
            <IconChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {(['open', 'pending', 'resolved'] as ConversationStatus[]).map(
            (item) => (
              <DropdownMenuItem
                key={item}
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange(item)}
                className={cn('text-xs', status === item && 'font-semibold')}
              >
                <span
                  className={cn(
                    'mr-2 h-1.5 w-1.5 flex-shrink-0 rounded-full',
                    STATUS_DOT[item],
                  )}
                />
                {STATUS_LABELS[item]}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-neutral-400"
          >
            <IconDots className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuItem onClick={onCopyLink} className="gap-2 text-xs">
            <IconLink className="h-3.5 w-3.5" /> Copy conversation link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onClose}
            className="gap-2 text-xs text-red-600 focus:text-red-600"
          >
            <IconX className="h-3.5 w-3.5" /> Close conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="secondary"
        size="sm"
        className="h-7 rounded-full px-3 text-xs"
        onClick={onClose}
      >
        Close
      </Button>
    </div>
  );
}
