import { settingsChannelsService } from "./settings-channels.service";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const [channels, aiSettings] = await Promise.all([
    settingsChannelsService.fetchChannels(),
    settingsChannelsService.fetchAISettings(),
  ]);
  return <SettingsContent initialChannels={channels} initialAISettings={aiSettings} />;
}
