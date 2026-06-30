import Link from "next/link";
import {
  APP_LEGAL_NAME,
  ITALIAN_DPA_ADDRESS,
  ITALIAN_DPA_NAME,
  ITALIAN_DPA_URL,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_FOOTER_TEXT,
  PRIVACY_POLICY_INTRO,
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
            Informativa sulla privacy
          </h1>
          <p className="text-muted-foreground">
            {APP_LEGAL_NAME} · Ultimo aggiornamento: {PRIVACY_POLICY_LAST_UPDATED}{" "}
            · Italia
          </p>
        </header>
      )}

      <p className="text-base text-foreground/90">{PRIVACY_POLICY_INTRO}</p>

      <div className="space-y-6">
        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              {section.title}
            </h2>
            <p className="whitespace-pre-line">{section.body}</p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4">
        <h2 className="text-base font-semibold text-foreground">Contatti</h2>
        <p className="mt-2 whitespace-pre-line">
          Per richieste relative alla privacy, scrivi a{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
          {"\n\n"}
          Per proporre reclamo all&apos;autorità di controllo italiana, contatta
          il{" "}
          <a
            href={ITALIAN_DPA_URL}
            className="font-medium text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {ITALIAN_DPA_NAME}
          </a>{" "}
          ({ITALIAN_DPA_ADDRESS}).
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
        Informativa sulla privacy
      </Link>
      {" · "}
      {PRIVACY_FOOTER_TEXT}
    </p>
  );
}
