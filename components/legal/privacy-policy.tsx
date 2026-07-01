import Link from "next/link";
import {
  ITALIAN_DPA_NAME,
  ITALIAN_DPA_URL,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_FOOTER_NOTICE,
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_SUBTITLE,
  PRIVACY_POLICY_TITLE,
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
            {PRIVACY_POLICY_TITLE}
          </h1>
          <p className="text-muted-foreground">{PRIVACY_POLICY_SUBTITLE}</p>
        </header>
      )}

      <p className="text-base text-foreground/90">{PRIVACY_POLICY_INTRO}</p>

      <div className="space-y-6">
        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              {section.title}
            </h2>
            <p>{section.body}</p>
            {section.items && section.items.length > 0 && (
              <ul className="list-inside list-disc space-y-1.5 pl-1">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
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
          . To lodge a complaint with the Italian supervisory authority, contact the{" "}
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
        Privacy policy
      </Link>
      {" · "}
      {PRIVACY_FOOTER_NOTICE}
    </p>
  );
}
