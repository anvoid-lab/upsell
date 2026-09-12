'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useOnboardingFlow } from '@/components/shared/onboarding-flow';

export function InboxOnboardingIntroduction() {
  const { next } = useOnboardingFlow();

  return (
    <div className="mx-auto w-full max-w-4xl px-1 text-center">
      <div
        className="mx-auto w-full max-w-3xl overflow-hidden"
        style={{
          maskImage: 'radial-gradient(ellipse 82% 78% at center, black 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 82% 78% at center, black 55%, transparent 100%)',
        }}
      >
        <Image
          src="/images/inbox-onboard.gif"
          alt="Preview of conversations arriving in the inbox"
          width={960}
          height={540}
          priority
          unoptimized
          className="h-auto w-full mix-blend-multiply"
        />
      </div>
      <h1 className="mt-6 text-xl font-semibold text-zinc-900">
        Bring your conversations together
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        Connect a messaging channel to receive and reply to customer conversations from your inbox.
      </p>
      <Button className="mt-6 rounded-full px-6" onClick={next}>
        Connect a channel
      </Button>
    </div>
  );
}
