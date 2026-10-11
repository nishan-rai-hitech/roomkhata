import { SettingsView } from "@/components/settings/settings-view";
import { getAppContext, getUserSettings } from "@/lib/server/data";

export default async function SettingsPage() {
  const [{ user }, settings] = await Promise.all([getAppContext(), getUserSettings()]);
  return <SettingsView user={user} settings={settings} />;
}
