'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChannelCard } from '@/components/shared/channel-card';
import { useOnboardingFlow } from '@/components/shared/onboarding-flow';
import type { ChannelConnection } from '@/types';
import type { InboxChannel } from '@core/contracts/inbox.contract';

export function InboxChannelSelection({
  channels,
  onSelect,
}: {
  channels: ChannelConnection[];
  onSelect: (channel: InboxChannel) => void;
}) {
  const { previous } = useOnboardingFlow();

  return (
    <div className="mx-auto w-full max-w-2xl px-1 text-left">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-2" onClick={previous}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <h1 className="text-xl font-semibold text-zinc-900">Choose a channel</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Select where you want to receive customer conversations.
      </p>
      <div className="mt-6 space-y-2">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.platform}
            channel={channel}
            onConnect={() => onSelect(channel.platform as InboxChannel)}
          />
        ))}
      </div>
    </div>
  );
}
