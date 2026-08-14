"use client";

import { FC } from "react";
import { MessageCircle, Camera, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { formatDate } from "@/lib/format";
import { useSettings } from "./settings-channels.hook";
import type { ChannelConnection, AISettings } from "@/types";

const PLATFORM_INFO = {
  whatsapp: { label: "WhatsApp Business", icon: MessageCircle, color: "bg-emerald-50 border-emerald-100", iconColor: "text-emerald-600" },
  instagram: { label: "Instagram",        icon: Camera,         color: "bg-pink-50 border-pink-100",    iconColor: "text-pink-600" },
  facebook:  { label: "Facebook Page",    icon: Users,          color: "bg-blue-50 border-blue-100",    iconColor: "text-blue-600" },
};

interface SettingsContentProps {
  initialChannels: ChannelConnection[];
  initialAISettings: AISettings;
}

export const SettingsContent: FC<SettingsContentProps> = ({ initialChannels, initialAISettings }) => {
  const { channels, aiSettings, isSaving, saved, handleConnect, handleDisconnect, updateAISetting, handleSaveAI } =
    useSettings(initialChannels, initialAISettings);

  return (
    <div className="flex-1 overflow-auto bg-zinc-50/50">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="text-lg font-semibold text-zinc-900 mb-0.5">Settings</h1>
        <p className="text-sm text-zinc-400 mb-8">Manage your connected channels and AI behaviour</p>

        {/* Channels */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Connected channels</h2>
          <div className="space-y-2">
            {channels.map((ch) => (
              <ChannelCard
                key={ch.platform}
                channel={ch}
                onConnect={() => handleConnect(ch.platform)}
                onDisconnect={() => handleDisconnect(ch.platform)}
              />
            ))}
          </div>
        </section>

        {/* AI Settings */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">AI configuration</h2>
          <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">

            {/* Follow-up delay */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-800">Follow-up delay</p>
                <p className="text-xs text-zinc-400 mt-0.5">Hours to wait before sending a follow-up</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="w-7 h-7 rounded-full" onClick={() => updateAISetting("follow_up_delay_hours", Math.max(1, aiSettings.follow_up_delay_hours - 1))}>−</Button>
                <span className="w-8 text-center text-sm font-semibold text-zinc-900">{aiSettings.follow_up_delay_hours}h</span>
                <Button variant="outline" size="icon" className="w-7 h-7 rounded-full" onClick={() => updateAISetting("follow_up_delay_hours", Math.min(48, aiSettings.follow_up_delay_hours + 1))}>+</Button>
              </div>
            </div>

            {/* Toggles */}
            {([
              ["use_urgency",      "Urgency",       "Alert when stock is low"],
              ["use_upsell",       "Upsell",        "Suggest related products"],
              ["use_social_proof", "Social proof",  "Share customer reviews"],
              ["use_cart_recovery","Cart recovery", "Re-engage silent leads"],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="p-4 flex items-center justify-between">
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
                <p className="text-xs text-zinc-400 mt-0.5">How the AI sounds in follow-ups</p>
              </div>
              <SegmentedControl
                options={[
                  { value: "friendly",     label: "Friendly" },
                  { value: "professional", label: "Professional" },
                  { value: "casual",       label: "Casual" },
                ]}
                value={aiSettings.tone}
                onChange={v => updateAISetting("tone", v as AISettings["tone"])}
              />
            </div>

            {/* Language */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-800">Language</p>
                <p className="text-xs text-zinc-400 mt-0.5">Language for AI follow-up messages</p>
              </div>
              <SegmentedControl
                options={[
                  { value: "pt", label: "🇵🇹 PT" },
                  { value: "en", label: "🇬🇧 EN" },
                  { value: "fr", label: "🇫🇷 FR" },
                ]}
                value={aiSettings.language}
                onChange={v => updateAISetting("language", v as AISettings["language"])}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleSaveAI} disabled={isSaving} className="rounded-full px-5">
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
            {saved && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}
          </div>
        </section>
      </div>
    </div>
  );
};

const ChannelCard: FC<{ channel: ChannelConnection; onConnect: () => void; onDisconnect: () => void }> = ({
  channel, onConnect, onDisconnect,
}) => {
  const info = PLATFORM_INFO[channel.platform];
  const Icon = info.icon;
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full ${info.color} border flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${info.iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-800">{info.label}</p>
          {channel.connected
            ? <p className="text-xs text-zinc-400" suppressHydrationWarning>{channel.account_name}{channel.connected_at ? ` · Connected ${formatDate(channel.connected_at)}` : ""}</p>
            : <p className="text-xs text-zinc-400">Not connected</p>
          }
        </div>
      </div>
      <Button
        onClick={channel.connected ? onDisconnect : onConnect}
        variant={channel.connected ? "outline" : "default"}
        size="sm"
        className="rounded-full h-8 px-4 text-xs"
      >
        {channel.connected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
};
