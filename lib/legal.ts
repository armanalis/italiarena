/** Legal and privacy copy shared across the app (Italy / GDPR). */
export const APP_LEGAL_NAME = "Language Quiz";

export const SUPPORT_EMAIL = "support@italiarena.com";

/** Privacy and data-protection requests (same inbox as general support). */
export const PRIVACY_CONTACT_EMAIL = SUPPORT_EMAIL;

export const PRIVACY_POLICY_LAST_UPDATED = "June 2026";

/** Minimum age to use the service in Italy (Italian Privacy Code, art. 2-quinquies). */
export const MINIMUM_AGE_ITALY = 14;

export const ITALIAN_DPA_NAME =
  "Italian Data Protection Authority (Garante per la protezione dei dati personali)";

export const ITALIAN_DPA_URL = "https://www.garanteprivacy.it";

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: "Who we are",
    body: `${APP_LEGAL_NAME} is an Italian learning quiz service offered to users in Italy. The data controller is the operator of ${APP_LEGAL_NAME}. For any request relating to your personal data, contact us at ${PRIVACY_CONTACT_EMAIL}.`,
  },
  {
    title: "What we collect",
    body: "We collect only the data necessary to provide the service: email and username (or an auto-generated guest name), proficiency level, gameplay statistics, match history, mistake practice progress, optional question reports, and limited data sent to AI when you use Ask AI. We do not sell your personal data.",
  },
  {
    title: "Why we use it",
    body: "We process your data to create and manage your account, run matches and leaderboards, show statistics, handle reports, and — if you use it — generate AI explanations. The legal bases under the EU General Data Protection Regulation (GDPR) and the Italian Privacy Code (Legislative Decree 196/2003, as amended by Legislative Decree 101/2018) include: performance of the contract (providing the app), legitimate interest in operating and securing the service, and — where required — your consent (for example, optional AI features).",
  },
  {
    title: "How we keep it safe",
    body: "We apply appropriate technical and organisational measures under Article 32 GDPR. Your data is stored on secure infrastructure (database and authentication). Passwords are managed by our auth provider and are not stored in plain text. Access to production data is restricted. All connections to the app use encryption in transit (HTTPS).",
  },
  {
    title: "Third-party processors",
    body: "We use trusted providers acting as data processors under Article 28 GDPR: Supabase (database and authentication), Vercel (application hosting), and Groq (optional AI explanations when you request them). They process only the data needed for their service and are bound by data-processing agreements and their own security obligations. Where data is transferred outside the European Economic Area, we rely on appropriate safeguards provided by those suppliers (such as Standard Contractual Clauses).",
  },
  {
    title: "How long we keep data",
    body: "We keep your account and gameplay data for as long as your account is active. If you delete your account from Settings, we delete your profile, statistics, match history, and related personal data without undue delay. Residual copies may remain in encrypted backups for a limited technical retention period before automatic deletion.",
  },
  {
    title: "Your rights",
    body: `Under the GDPR and Italian privacy law you have the right to access, rectify, erase, restrict processing, object (where applicable), and data portability. You can update your profile in Settings, delete your account at any time, or write to ${PRIVACY_CONTACT_EMAIL} to exercise your rights. We will respond within the time limits set by law (generally one month under Article 12 GDPR). You also have the right to lodge a complaint with the ${ITALIAN_DPA_NAME} (${ITALIAN_DPA_URL}).`,
  },
  {
    title: "Children",
    body: `The service is intended for users aged ${MINIMUM_AGE_ITALY} and over, in line with Article 8 GDPR and Article 2-quinquies of the Italian Privacy Code (the age of consent for information society services in Italy). We do not knowingly collect personal data from anyone under ${MINIMUM_AGE_ITALY}. If you believe a minor has provided data without valid consent, contact us at ${PRIVACY_CONTACT_EMAIL} and we will delete it promptly.`,
  },
  {
    title: "Changes",
    body: "We may update this policy to reflect changes to the service or applicable law. We will publish the new date at the top of this page. If changes are substantial, we will provide a clear notice in the app where appropriate.",
  },
] as const;
