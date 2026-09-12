'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CHANNEL_DETAILS } from '@/components/shared/channel-card';
import { OnboardingFlow } from '@/components/shared/onboarding-flow';
import type { ChannelConnection } from '@/types';
import type { InboxChannel } from '@core/contracts/inbox.contract';
import { DEFAULT_INBOX_CHANNEL } from '@core/contracts/inbox.contract';
import { useIntegration } from './integration/integration.hook';
import { InboxOnboardingIntroduction } from './inbox-onboarding-introduction';
import { InboxChannelSelection } from './inbox-channel-selection';

export function InboxOnboarding({ channels }: { channels: ChannelConnection[] }) {
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState<InboxChannel | null>(null);
  const router = useRouter();
  const { status, error, url, start, reset } = useIntegration(DEFAULT_INBOX_CHANNEL);
  const pending = status === 'preparing' || status === 'waiting' || status === 'syncing';

  useEffect(() => {
    if (status !== 'connected') return;
    router.replace('/inbox');
    router.refresh();
  }, [router, status]);

  const selectChannel = (channel: InboxChannel) => {
    setSelectedChannel(channel);
    void start(channel);
  };

  const returnToChannels = () => {
    reset();
    setOnboardingStep(1);
    setSelectedChannel(null);
  };

  const slides = [
    <InboxOnboardingIntroduction key="introduction" />,
    <InboxChannelSelection key="channels" channels={channels} onSelect={selectChannel} />,
  ];

  if (selectedChannel && status !== 'ready') {
    const details = CHANNEL_DETAILS[selectedChannel];
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-md text-center" aria-live="polite">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
            {status === 'connected' ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <Loader2 className={`h-6 w-6 text-primary-600 ${pending ? 'animate-spin' : ''}`} />
            )}
          </div>
          <h1 className="text-base font-semibold text-neutral-900">
            {status === 'connected' ? `${details.label} connected` : `Connecting ${details.label}`}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            {pending
              ? 'Complete the secure connection in the authentication window.'
              : error ?? 'The connection was not completed.'}
          </p>
          {url && pending && (
            <Button className="mt-5 rounded-full" variant="outline" onClick={() => window.location.assign(url)}>
              Continue in this tab
            </Button>
          )}
          {(status === 'error' || status === 'popup_closed') && (
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" className="rounded-full" onClick={returnToChannels}>Choose another channel</Button>
              <Button className="rounded-full" onClick={() => void start(selectedChannel)}>Try again</Button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <OnboardingFlow
      steps={slides}
      initialStep={onboardingStep}
      onStepChange={setOnboardingStep}
    />
  );
}
