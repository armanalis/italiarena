/** Legal and privacy copy shared across the app (Italy / GDPR / Codice privacy). */

export const APP_NAME = "Italiarena";
export const APP_LEGAL_NAME = APP_NAME;
export const APP_WEBSITE = "https://italiarena.com";

export const SUPPORT_EMAIL = "support@italiarena.com";

/** Privacy and data-protection requests (same inbox as general support). */
export const PRIVACY_CONTACT_EMAIL = SUPPORT_EMAIL;

export const PRIVACY_POLICY_LAST_UPDATED = "June 30, 2026";

/** Minimum age to use the service in Italy (art. 2-quinquies Codice privacy). */
export const MINIMUM_AGE_ITALY = 14;

export const ITALIAN_DPA_NAME =
  "Garante per la protezione dei dati personali";

export const ITALIAN_DPA_URL = "https://www.garanteprivacy.it";

export const ITALIAN_DPA_ADDRESS = "Piazza Venezia 11, 00187 Roma";

export const ITALIAN_DPA_PEC = "protocollo@pec.gpdp.it";

export const PRIVACY_POLICY_TITLE = "Privacy policy";

export const PRIVACY_POLICY_SUBTITLE = `${APP_LEGAL_NAME} · Last updated: ${PRIVACY_POLICY_LAST_UPDATED} · Italy`;

export const PRIVACY_POLICY_INTRO =
  "This privacy notice is provided pursuant to Articles 13 and 14 of Regulation (EU) 2016/679 " +
  "(the «GDPR») and the Codice in materia di protezione dei dati personali (D.Lgs. 30 giugno 2003, " +
  "n. 196, as amended by D.Lgs. 10 agosto 2018, n. 101, hereinafter «Codice privacy») to users of " +
  "the Italiarena service located in or using the service from Italy. The text is written in clear, " +
  "plain language as required by Articles 12–14 GDPR and the Article 29 Working Party transparency " +
  "guidelines (rev. 1, April 2018).";

export type PrivacyPolicySection = {
  title: string;
  body: string;
  items?: readonly string[];
};

export const PRIVACY_POLICY_SECTIONS: readonly PrivacyPolicySection[] = [
  {
    title: "1. Data controller",
    body:
      `The data controller is the operator of ${APP_LEGAL_NAME} ` +
      `(website: ${APP_WEBSITE}). For any request relating to your personal data, contact the controller at ` +
      `${PRIVACY_CONTACT_EMAIL}.`,
  },
  {
    title: "2. Data Protection Officer (DPO)",
    body:
      "No Data Protection Officer (DPO) has been appointed, as processing does not fall within the " +
      "cases requiring one under art. 37 GDPR.",
  },
  {
    title: "3. Categories of personal data processed",
    body: "We process the following categories of data, limited to what is necessary for the service:",
    items: [
      "Identification and contact data: email address, display name (username), or an auto-generated name in guest mode.",
      "Profile and preference data: Italian proficiency level (CEFR), target language, sound and haptic settings.",
      "Gameplay data: statistics, match history, scores, mistakes, mistake-practice progress, and leaderboard position (registered users).",
      "Reports and contributions: content of reports on incorrect or ambiguous questions and questions submitted to the community.",
      "Artificial intelligence data: question text, selected answers, and generated explanations when you explicitly request «Ask AI».",
      "Authentication technical data: cookies and session tokens required for secure access, managed by our authentication provider.",
    ],
  },
  {
    title: "4. Purposes, legal bases, and retention periods",
    body:
      "For each purpose we indicate the legal basis under art. 6 GDPR and the retention period, as " +
      "required by art. 13(1)(c) and 13(2)(a) GDPR:",
    items: [
      "Account creation and management (email, credentials, profile): legal basis — performance of a contract or pre-contractual measures (art. 6(1)(b) GDPR); retention — for as long as the account is active.",
      "Guest mode (anonymous session, generated name, proficiency level): legal basis — performance of a contract (art. 6(1)(b) GDPR); retention — for the guest session or until conversion to a registered account.",
      "Matches, leaderboards, and statistics: legal basis — performance of a contract (art. 6(1)(b) GDPR); retention — for as long as the account is active.",
      "Mistake practice and post-match review: legal basis — performance of a contract (art. 6(1)(b) GDPR); retention — for as long as the account is active.",
      "Reporting problematic questions: legal basis — legitimate interest in ensuring content quality (art. 6(1)(f) GDPR); the interest is keeping questions accurate and useful for all users, with minimal impact on the data subject; retention — until the report is resolved, up to 24 months.",
      "Community question submissions: legal basis — performance of a contract (art. 6(1)(b) GDPR); retention — until administrative review; if approved, data remains in the question pool.",
      "AI explanations («Ask AI»): legal basis — consent given by your explicit request (art. 6(1)(a) GDPR); retention — generated explanations may be stored in a shared cache per question/answer; per-user usage logs are kept for the life of the account.",
      "Security, abuse prevention, and technical operation: legal basis — legitimate interest (art. 6(1)(f) GDPR); retention — technical logs for up to 90 days, unless longer retention is required by law.",
    ],
  },
  {
    title: "5. Whether data is required and consequences of refusal",
    body:
      "Providing data marked as required during registration (email and password) or when starting guest " +
      "mode (proficiency level) is necessary to enter into the contract and use the service. Refusal " +
      "prevents account creation or access to matches. Display name, reports, community submissions, " +
      "and «Ask AI» are optional; not using them does not block core use of the service, but limits " +
      "the related features.",
  },
  {
    title: "6. Recipients and processors",
    body:
      "Data may be shared with parties that process it on our behalf as data processors under " +
      "art. 28 GDPR, bound by data processing agreements:",
    items: [
      "Supabase Inc. — database, authentication, and application data hosting.",
      "Vercel Inc. — web application hosting.",
      "Groq Inc. — optional educational explanations when you request «Ask AI».",
    ],
  },
  {
    title: "7. Transfers to third countries",
    body:
      "Some providers listed above may process data outside the European Economic Area (EEA), " +
      "including the United States. In such cases, transfers take place in compliance with " +
      "Articles 44–49 GDPR, on the basis of European Commission adequacy decisions and/or " +
      "Standard Contractual Clauses (SCC) approved by the European Commission, as well as " +
      "supplementary safeguards adopted by providers. Copies of applicable safeguards may be " +
      "requested at " +
      PRIVACY_CONTACT_EMAIL +
      ".",
  },
  {
    title: "8. Automated decision-making and profiling",
    body:
      "We do not carry out automated decision-making that produces legal effects or similarly " +
      "significantly affects you under art. 22 GDPR. Matchmaking is based on declared proficiency " +
      "level solely to organize fair matches, without commercial profiling. We do not sell or share " +
      "personal data with third parties for marketing purposes.",
  },
  {
    title: "9. Promotional communications",
    body:
      "Under art. 130 Codice privacy, we do not send promotional communications, newsletters, or " +
      "advertising messages by email, phone, or automated systems without your prior free, specific, " +
      "informed, and documented consent. The service sends only communications strictly necessary for " +
      "account and service operation.",
  },
  {
    title: "10. Security measures",
    body:
      "We apply appropriate technical and organizational measures under art. 32 GDPR, including " +
      "encryption in transit (HTTPS/TLS), secure credential handling through our authentication " +
      "provider (passwords not stored in plain text), restricted access to production data, and " +
      "contractual agreements with processors.",
  },
  {
    title: "11. Your rights",
    body:
      `Under Articles 15–22 GDPR and the Codice privacy, you have the right of access, rectification, ` +
      `erasure, restriction of processing, objection (where applicable), and data portability. Where ` +
      `processing is based on consent (for example «Ask AI»), you may withdraw consent at any time ` +
      `without affecting the lawfulness of processing based on consent before withdrawal. You can update ` +
      `your profile in Settings, delete your account at any time, or write to ${PRIVACY_CONTACT_EMAIL}. ` +
      `We respond within one month of receiving your request, extendable by two further months in ` +
      `complex cases, as provided by art. 12(3) GDPR.`,
  },
  {
    title: "12. Right to lodge a complaint with the Garante",
    body:
      `You may lodge a complaint with the ${ITALIAN_DPA_NAME} under art. 77 GDPR and Articles ` +
      `140-bis et seq. of the Codice privacy if you believe processing violates applicable law.`,
    items: [
      `Website: ${ITALIAN_DPA_URL}`,
      `Address: ${ITALIAN_DPA_ADDRESS}`,
      `PEC: ${ITALIAN_DPA_PEC}`,
    ],
  },
  {
    title: "13. Children",
    body:
      `The service is intended for users aged ${MINIMUM_AGE_ITALY} and over, in line with art. 8 GDPR ` +
      `and art. 2-quinquies Codice privacy (age of consent for information society services in Italy). ` +
      `We do not knowingly collect personal data from anyone under ${MINIMUM_AGE_ITALY}. If you believe a ` +
      `minor provided data without valid parental consent, contact us at ${PRIVACY_CONTACT_EMAIL} and we ` +
      `will delete it without undue delay.`,
  },
  {
    title: "14. Account deletion and residual retention",
    body:
      "When you delete your account from Settings, we erase your profile, statistics, match history, " +
      "and other linked personal data without undue delay. Residual copies may remain in encrypted " +
      "backups for a limited technical period (up to 30 days) before automatic deletion. AI " +
      "explanations stored in a shared cache per question/answer may be kept in anonymized or " +
      "non-identifiable form.",
  },
  {
    title: "15. Changes to this notice",
    body:
      "We may update this notice to reflect changes to the service or applicable law. We will publish " +
      "the updated date at the top of this page. For material changes, we will provide a clear notice " +
      "in the app where appropriate.",
  },
] as const;

/** Short notice for footers and auth screens. */
export const PRIVACY_FOOTER_NOTICE =
  "Data processing in compliance with the GDPR and the Codice privacy italiano (D.Lgs. 196/2003).";

/** Short notice for the settings privacy card. */
export const PRIVACY_SETTINGS_SUMMARY = [
  "We collect only data needed to run the app, as listed in our privacy notice (art. 13 GDPR).",
  "Data is stored securely (HTTPS), never sold, and not used for promotional communications (art. 130 Codice privacy).",
  "You can update your profile in Settings, delete your account at any time, or contact us to exercise your rights under the GDPR and Italian privacy law.",
] as const;
