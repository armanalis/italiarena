/** Public privacy notice (artt. 13–14 GDPR and Italian Codice privacy). */
import type { Metadata } from "next";
import Link from "next/link";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { LegalFooter, PrivacyPolicyContent } from "@/components/legal/privacy-policy";
import { getPrivacyCopy, resolvePrivacyLocale } from "@/lib/legal";

type PrivacyPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PrivacyPageProps): Promise<Metadata> {
  const locale = resolvePrivacyLocale((await searchParams).lang);
  const copy = getPrivacyCopy(locale);

  return {
    title: copy.title,
    description: copy.metaDescription,
    alternates: {
      languages: {
        it: "/privacy",
        en: "/privacy?lang=en",
      },
    },
  };
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const locale = resolvePrivacyLocale((await searchParams).lang);
  const backLabel = locale === "en" ? "← Back to home" : "← Torna alla home";

  return (
    <AuroraCanvas subtle>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-12">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {backLabel}
        </Link>

        <PrivacyPolicyContent locale={locale} />

        <LegalFooter locale={locale} className="mt-10" />
      </main>
    </AuroraCanvas>
  );
}
