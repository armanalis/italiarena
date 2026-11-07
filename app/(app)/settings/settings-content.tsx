import { getSettingsData } from "@/app/(app)/settings/actions";
import { SettingsPanels } from "@/components/settings/settings-panels";
import { getT } from "@/lib/i18n-server";

export async function SettingsContent() {
  const { profile, recentMatches, showLastSeen, showDailyResults, languageLevels } = await getSettingsData();
  const t = await getT();

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Settings")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Manage your account and learning preferences.")}
        </p>
      </div>

      {/* key: after a language switch the form must not save the old language back. */}
      <SettingsPanels
        key={profile.target_language}
        profile={profile}
        recentMatches={recentMatches}
        showLastSeen={showLastSeen}
        showDailyResults={showDailyResults}
        languageLevels={languageLevels}
      />
    </main>
  );
}
