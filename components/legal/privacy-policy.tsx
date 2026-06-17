import Link from "next/link";
import {
  APP_LEGAL_NAME,
  ITALIAN_DPA_NAME,
  ITALIAN_DPA_URL,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_SECTIONS,
} from "@/lib/legal";
import { cn } from "@/lib/utils";

type PrivacyPolicyContentProps = {
  className?: string;
  showTitle?: boolean;
};

export function PrivacyPolicyContent({
  className,
  showTitle = true,
}: PrivacyPolicyContentProps) {
  return (
    <article className={cn("space-y-8 text-sm leading-relaxed text-muted-foreground", className)}>
      {showTitle && (
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            {APP_LEGAL_NAME} · Last updated {PRIVACY_POLICY_LAST_UPDATED} ·
            Italy
          </p>
        </header>
      )}

      <p className="text-base text-foreground/90">
        This policy applies to users in Italy. It explains how we collect, use,
        and protect your personal data under the EU General Data Protection
        Regulation (GDPR) and the Italian Privacy Code (Legislative Decree
        196/2003, as amended by Legislative Decree 101/2018).
      </p>

      <div className="space-y-6">
        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              {section.title}
            </h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4">
        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p className="mt-2">
          For privacy requests, email{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          . To lodge a complaint with the Italian supervisory authority, contact
          the{" "}
          <a
            href={ITALIAN_DPA_URL}
            className="font-medium text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {ITALIAN_DPA_NAME}
          </a>
          .
        </p>
      </section>
    </article>
  );
}

type LegalFooterProps = {
  className?: string;
};

/** Standard privacy link shown on public auth pages. */
export function LegalFooter({ className }: LegalFooterProps) {
  return (
    <p
      className={cn(
        "text-center text-xs leading-relaxed text-muted-foreground",
        className
      )}
    >
      <Link
        href="/privacy"
        className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
      >
        Privacy Policy
      </Link>
      {" · "}
      Your data is handled in line with GDPR and Italian privacy law.
    </p>
  );
}
