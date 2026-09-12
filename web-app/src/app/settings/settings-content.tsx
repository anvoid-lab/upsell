'use client';

import { FC, useState } from 'react';
import { IntegrationView } from '@/app/inbox/integration/integration-view';
import { Button } from '@/components/ui/button';
import { ChannelCard } from '@/components/shared/channel-card';
import { Switch } from '@/components/ui/switch';
import { SegmentedControl } from '@/components/shared/segmented-control';
import { useSettings } from './settings-channels.hook';
import type { ChannelConnection, AISettings } from '@/types';
import { AI_FEATURES_ENABLED, DEFAULT_AI_SETTINGS } from '@/lib/ai-features';
import type { InboxChannel } from '@core/contracts/inbox.contract';

interface SettingsContentProps {
  initialChannels: ChannelConnection[];
}

export const SettingsContent: FC<SettingsContentProps> = ({
  initialChannels,
}) => {
  const { channels, handleDisconnect, handleSync, syncing, error } =
    useSettings(initialChannels);
  const [integrating, setIntegrating] = useState<InboxChannel | null>(null);
  // Archived presentation only: these controls have no persistence or actions.
  const aiSettings = DEFAULT_AI_SETTINGS;
  const isSaving = false;
  const saved = false;
  const updateAISetting: (key: keyof AISettings, value: unknown) => void = () => {};
  const handleSaveAI = () => {};

  return (
    <div className="flex-1 overflow-auto bg-zinc-50/50">
      {integrating && (
        <IntegrationView
          channel={integrating}
          onClose={() => setIntegrating(null)}
        />
      )}
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="text-lg font-semibold text-zinc-900 mb-0.5">Settings</h1>
        <p className="text-sm text-zinc-400 mb-8">
          {AI_FEATURES_ENABLED
            ? 'Manage your connected channels and AI behaviour'
            : 'Manage your connected channels'}
        </p>

        {error && (
          <p role="alert" className="text-sm text-red-600 mb-4">
            {error}
          </p>
        )}
        {/* Channels */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            Connected channels
          </h2>
          <div className="space-y-2">
            {channels
              .filter(
                (ch) =>
                  ch.platform === 'whatsapp' || ch.platform === 'instagram',
              )
              .map((ch) => (
                <ChannelCard
                  key={ch.platform}
                  channel={ch}
                  onConnect={() => setIntegrating(ch.platform as InboxChannel)}
                  onDisconnect={() => handleDisconnect(ch.platform)}
                  onSync={() => handleSync(ch.platform)}
                  syncing={syncing === ch.platform}
                />
              ))}
          </div>
        </section>

        {AI_FEATURES_ENABLED && (
          /* AI Settings */
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              AI configuration
            </h2>
            <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
              {/* Follow-up delay */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-800">
                    Follow-up delay
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Hours to wait before sending a follow-up
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-7 h-7 rounded-full"
                    onClick={() =>
                      updateAISetting(
                        'follow_up_delay_hours',
                        Math.max(1, aiSettings.follow_up_delay_hours - 1),
                      )
                    }
                  >
                    −
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold text-zinc-900">
                    {aiSettings.follow_up_delay_hours}h
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-7 h-7 rounded-full"
                    onClick={() =>
                      updateAISetting(
                        'follow_up_delay_hours',
                        Math.min(48, aiSettings.follow_up_delay_hours + 1),
                      )
                    }
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Toggles */}
              {(
                [
                  ['use_urgency', 'Urgency', 'Alert when stock is low'],
                  ['use_upsell', 'Upsell', 'Suggest related products'],
                  [
                    'use_social_proof',
                    'Social proof',
                    'Share customer reviews',
                  ],
                  [
                    'use_cart_recovery',
                    'Cart recovery',
                    'Re-engage silent leads',
                  ],
                ] as const
              ).map(([key, label, desc]) => (
                <div
                  key={key}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
                  </div>
                  <Switch
                    checked={aiSettings[key] as boolean}
                    onCheckedChange={(checked) => updateAISetting(key, checked)}
                  />
                </div>
              ))}

              {/* Tone */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-800">Tone</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    How the AI sounds in follow-ups
                  </p>
                </div>
                <SegmentedControl
                  options={[
                    { value: 'friendly', label: 'Friendly' },
                    { value: 'professional', label: 'Professional' },
                    { value: 'casual', label: 'Casual' },
                  ]}
                  value={aiSettings.tone}
                  onChange={(v) =>
                    updateAISetting('tone', v as AISettings['tone'])
                  }
                />
              </div>

              {/* Language */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-800">Language</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Language for AI follow-up messages
                  </p>
                </div>
                <SegmentedControl
                  options={[
                    { value: 'pt', label: '🇵🇹 PT' },
                    { value: 'en', label: '🇬🇧 EN' },
                    { value: 'fr', label: '🇫🇷 FR' },
                  ]}
                  value={aiSettings.language}
                  onChange={(v) =>
                    updateAISetting('language', v as AISettings['language'])
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Button
                onClick={handleSaveAI}
                disabled
                className="rounded-full px-5"
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
              {saved && (
                <span className="text-xs text-emerald-600 font-medium">
                  ✓ Saved
                </span>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
