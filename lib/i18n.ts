/**
 * The app's own language (menus, buttons, messages), not the language being
 * learned. Texts are written in English in the code and looked up in the
 * Turkish or Italian dictionary; a text missing there shows in English.
 * Server: getT() in lib/i18n-server.ts. Client: useT() in components/ui-language-provider.tsx.
 * The dictionaries are not imported here: browsers get one from the layout
 * only when they use that language.
 */

export const UI_LANGUAGES = ["en", "tr", "it"] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];
export const DEFAULT_UI_LANGUAGE: UiLanguage = "en";
/** The device's choice; the account keeps a copy for new devices and reminders. */
export const UI_LANGUAGE_COOKIE = "ui_lang";
export const UI_LANGUAGE_MAX_AGE = 60 * 60 * 24 * 365;
/** Each language's name in itself, for the switch in Settings. */
export const UI_LANGUAGE_NAMES: Record<UiLanguage, string> = { en: "English", tr: "Türkçe", it: "Italiano" };

export function isUiLanguage(value: unknown): value is UiLanguage {
  return UI_LANGUAGES.includes(value as UiLanguage);
}

/** The first supported language in an Accept-Language header ("tr-TR,tr;q=0.9,en;q=0.8"), by weight. */
export function uiLanguageFromHeader(header: string | null | undefined): UiLanguage {
  const ranked = (header ?? "")
    .split(",")
    .map((part, order) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.trim().toLowerCase().split("-")[0], weight: q ? Number(q.slice(2)) || 0 : 1, order };
    })
    .filter(({ base, weight }) => base && weight > 0)
    .sort((a, b) => b.weight - a.weight || a.order - b.order);
  return ranked.map(({ base }) => base).find(isUiLanguage) ?? DEFAULT_UI_LANGUAGE;
}

export type Vars = Record<string, string | number>;
export type Translate = (text: string, vars?: Vars) => string;
/** English text → its translation; null for English itself. */
export type Dictionary = Readonly<Record<string, string>>;

/** t("{n} to review today", { n: 3 }): the text from `dictionary` (English when missing), with {name} filled in. */
export function translator(dictionary: Dictionary | null): Translate {
  return (text, vars) => {
    const template = dictionary?.[text] ?? text;
    return vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : template;
  };
}

/** A text the database keeps in English, Turkish and Italian. The app language's text when it exists. */
export function pickLocalized(
  language: UiLanguage,
  english: string,
  localized: { tr?: string | null; it?: string | null }
): string {
  const text = language === "tr" ? localized.tr : language === "it" ? localized.it : null;
  return text ? text : english;
}
