/** Public privacy policy and GDPR information (Italian informativa, art. 13 GDPR). */
import type { Metadata } from "next";
import Link from "next/link";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { LegalFooter, PrivacyPolicyContent } from "@/components/legal/privacy-policy";
import { PRIVACY_POLICY_TITLE } from "@/lib/legal";

export const metadata: Metadata = {
  title: PRIVACY_POLICY_TITLE,
  description:
    "Informativa privacy di Italiarena ai sensi del GDPR e del Codice privacy italiano (D.Lgs. 196/2003).",
};

export default function PrivacyPage() {
  return (
    <AuroraCanvas subtle>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-12">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Torna alla home
        </Link>

        <PrivacyPolicyContent />

        <LegalFooter className="mt-10" />
      </main>
    </AuroraCanvas>
  );
}
