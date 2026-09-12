'use client';

import { Camera, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import type { ChannelConnection } from '@/types';

export const CHANNEL_DETAILS = {
  whatsapp: {
    label: 'WhatsApp Business',
    icon: MessageCircle,
    color: 'bg-emerald-50 border-emerald-100',
    iconColor: 'text-emerald-600',
  },
  instagram: {
    label: 'Instagram',
    icon: Camera,
    color: 'bg-pink-50 border-pink-100',
    iconColor: 'text-pink-600',
  },
  facebook: {
    label: 'Facebook Page',
    icon: Users,
    color: 'bg-blue-50 border-blue-100',
    iconColor: 'text-blue-600',
  },
} as const;

export function ChannelCard({
  channel,
  onConnect,
  onDisconnect,
  onSync,
  syncing = false,
  disabled = false,
}: {
  channel: ChannelConnection;
  onConnect: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  syncing?: boolean;
  disabled?: boolean;
}) {
  const info = CHANNEL_DETAILS[channel.platform];
  const Icon = info.icon;

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full ${info.color} border flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-4 h-4 ${info.iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-800">{info.label}</p>
          {channel.connected ? (
            <p className="text-xs text-zinc-400" suppressHydrationWarning>
              {channel.account_name}
              {channel.connected_at
                ? ` · Connected ${formatDate(channel.connected_at)}`
                : ''}
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              {channel.connection_status === 'reconnect_required'
                ? 'Reconnect required'
                : 'Not connected'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {channel.connected && onSync && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-8 px-4 text-xs"
            onClick={onSync}
            disabled={syncing || disabled}
          >
            {syncing ? 'Importing…' : 'Import history'}
          </Button>
        )}
        <Button
          onClick={channel.connected && onDisconnect ? onDisconnect : onConnect}
          variant={channel.connected ? 'outline' : 'default'}
          size="sm"
          className="rounded-full h-8 px-4 text-xs"
          disabled={disabled}
        >
          {channel.connection_status === 'reconnect_required'
            ? 'Reconnect'
            : channel.connected && onDisconnect
              ? 'Disconnect'
              : 'Connect'}
        </Button>
      </div>
    </div>
  );
}
