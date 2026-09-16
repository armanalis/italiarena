import Link from "next/link";
import {
  APP_LEGAL_NAME,
  ITALIAN_DPA_NAME,
  ITALIAN_DPA_URL,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_HREF_EN,
  PRIVACY_HREF_IT,
  PRIVACY_POLICY_LAST_UPDATED_ISO,
  getPrivacyCopy,
  privacyHref,
  type PrivacyLocale,
} from "@/lib/legal";
import { cn } from "@/lib/utils";

type PrivacyPolicyContentProps = {
  className?: string;
  showTitle?: boolean;
  locale?: PrivacyLocale;
};

export function PrivacyPolicyContent({
  className,
  showTitle = true,
  locale = "it",
}: PrivacyPolicyContentProps) {
  const copy = getPrivacyCopy(locale);

  return (
    <article
      lang={locale}
      className={cn("space-y-8 text-sm leading-relaxed text-muted-foreground", className)}
    >
      {showTitle && (
        <header className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {copy.title}
          </h1>
          <p className="text-muted-foreground">
            {APP_LEGAL_NAME} ·{" "}
            <time dateTime={PRIVACY_POLICY_LAST_UPDATED_ISO}>{copy.lastUpdated}</time>
            {" · "}
            {copy.jurisdictionLabel}
          </p>
          <p className="text-xs text-muted-foreground">{copy.officialLanguageNote}</p>
          <nav
            className="flex flex-wrap gap-2"
            aria-label={copy.languageSwitchLabel}
          >
            <Link
              href={PRIVACY_HREF_IT}
              hrefLang="it"
              aria-current={locale === "it" ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                locale === "it"
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {copy.languageSwitchIt}
            </Link>
            <Link
              href={PRIVACY_HREF_EN}
              hrefLang="en"
              aria-current={locale === "en" ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                locale === "en"
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {copy.languageSwitchEn}
            </Link>
          </nav>
        </header>
      )}

      <p className="text-base text-foreground/90">{copy.intro}</p>

      <div className="space-y-6">
        {copy.sections.map((section) => {
          const table = section.table;

          return (
            <section
              key={section.title}
              id={section.anchor}
              className="space-y-2 scroll-mt-20"
            >
              <h2 className="text-base font-semibold text-foreground">
                {section.title}
              </h2>
              <p>{section.body}</p>
              {table && (
                <>
                  <div className="space-y-3 sm:hidden">
                    {table.rows.map((row) => (
                      <dl
                        key={row.join("|")}
                        className="space-y-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-3"
                      >
                        {table.headers.map((header, cellIndex) => (
                          <div key={`${row[0]}-${header}`}>
                            <dt className="text-[11px] font-medium text-foreground/70">
                              {header}
                            </dt>
                            <dd className="mt-0.5 text-xs">{row[cellIndex]}</dd>
                          </div>
                        ))}
                      </dl>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-lg border border-border/60 sm:block">
                    <table className="w-full min-w-[36rem] text-left text-xs">
                      <thead className="bg-muted/40">
                        <tr className="border-b border-border/60">
                          {table.headers.map((header) => (
                            <th
                              key={header}
                              scope="col"
                              className="px-3 py-2 font-medium text-foreground"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row) => (
                          <tr
                            key={row.join("|")}
                            className="border-b border-border/50 last:border-0"
                          >
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${row[0]}-${cellIndex}`}
                                className="px-3 py-2 align-top"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {section.items && section.items.length > 0 && (
                <ul className="list-inside list-disc space-y-1.5 pl-1">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4">
        <h2 className="text-base font-semibold text-foreground">{copy.contactHeading}</h2>
        <p className="mt-2">
          {copy.contactBefore}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >{PRIVACY_CONTACT_EMAIL}</a>{copy.contactBetween}<a
            href={ITALIAN_DPA_URL}
            className="font-medium text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >{ITALIAN_DPA_NAME}</a>{copy.contactAfter}
        </p>
      </section>
    </article>
  );
}

type LegalFooterProps = {
  className?: string;
  locale?: PrivacyLocale;
};

/** Standard privacy link shown on public auth pages. Defaults to the English notice. */
export function LegalFooter({ className, locale = "en" }: LegalFooterProps) {
  const copy = getPrivacyCopy(locale);

  return (
    <p
      className={cn(
        "text-center text-xs leading-relaxed text-muted-foreground",
        className
      )}
    >
      <Link
        href={privacyHref(locale)}
        className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
      >
        {copy.footerLinkLabel}
      </Link>
      {" · "}
      {copy.footerNotice}
    </p>
  );
}
