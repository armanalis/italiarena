import { getSettingsData } from "@/app/dashboard/settings/actions";
import { SettingsPanels } from "@/components/settings/settings-panels";

export async function SettingsContent() {
  const { profile, recentMatches } = await getSettingsData();

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your account and learning preferences.
        </p>
      </div>

      <SettingsPanels profile={profile} recentMatches={recentMatches} />
    </main>
  );
}
