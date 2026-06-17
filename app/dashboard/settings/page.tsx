import { Suspense } from "react";
import { DashboardSectionSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { SettingsContent } from "@/app/dashboard/settings/settings-content";

export default function SettingsPage() {
  return (
    <Suspense fallback={<DashboardSectionSkeleton cards={1} />}>
      <SettingsContent />
    </Suspense>
  );
}
