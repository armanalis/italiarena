/** Public privacy policy and GDPR information. */
import Link from "next/link";
import { LegalFooter, PrivacyPolicyContent } from "@/components/legal/privacy-policy";

export default function PrivacyPage() {
  return (
    <main className="relative w-full bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.12),_transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-2xl px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-12">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to home
        </Link>

        <PrivacyPolicyContent />

        <LegalFooter className="mt-10" />
      </div>
    </main>
  );
}
