/** Public privacy policy and GDPR information. */
import Link from "next/link";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { LegalFooter, PrivacyPolicyContent } from "@/components/legal/privacy-policy";

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
