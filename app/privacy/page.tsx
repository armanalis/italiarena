/** Public privacy notice (artt. 13–14 GDPR and Italian Codice privacy). */
import type { Metadata } from "next";
import Link from "next/link";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { LegalFooter, PrivacyPolicyContent } from "@/components/legal/privacy-policy";
import { PRIVACY_LOCALES, getPrivacyCopy, privacyHref, resolvePrivacyLocale } from "@/lib/legal";

const BACK_LABEL = { it: "← Torna alla home", en: "← Back to home", tr: "← Ana sayfaya dön" } as const;

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
      languages: Object.fromEntries(PRIVACY_LOCALES.map((option) => [option, privacyHref(option)])),
    },
  };
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const locale = resolvePrivacyLocale((await searchParams).lang);

  return (
    <AuroraCanvas subtle>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-12">
        <Link
          href="/"
          className="mb-8 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {BACK_LABEL[locale]}
        </Link>

        <PrivacyPolicyContent locale={locale} />

        <LegalFooter locale={locale} className="mt-10" />
      </main>
    </AuroraCanvas>
  );
}
