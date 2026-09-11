import { settingsChannelsService } from "./settings-channels.service";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const channels = await settingsChannelsService.fetchChannels();
  return <SettingsContent initialChannels={channels} />;
}
