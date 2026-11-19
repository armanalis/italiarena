"use client";

import { createContext, Fragment, useContext, useEffect, useMemo, type ReactNode } from "react";
import { translator, UI_LANGUAGE_COOKIE, UI_LANGUAGE_MAX_AGE, type Dictionary, type UiLanguage } from "@/lib/i18n";

const UiLanguageContext = createContext<{ language: UiLanguage; dictionary: Dictionary | null }>({
  language: "en",
  dictionary: null,
});

/** Hands the app language to client components; keeps a first, system-picked language in the cookie. */
export function UiLanguageProvider({
  language,
  dictionary,
  remember,
  children,
}: {
  language: UiLanguage;
  /** From the server, and only for Turkish: English pages do not download it. */
  dictionary: Dictionary | null;
  /** No cookie yet: store this one, so the first language stays the same. */
  remember: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (remember) {
      document.cookie = `${UI_LANGUAGE_COOKIE}=${language}; path=/; max-age=${UI_LANGUAGE_MAX_AGE}; samesite=lax`;
    }
  }, [language, remember]);
  const value = useMemo(() => ({ language, dictionary }), [language, dictionary]);
  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage() {
  return useContext(UiLanguageContext).language;
}

/** Client components: const t = useT(); t("Enter the Arena"). */
export function useT() {
  const { dictionary } = useContext(UiLanguageContext);
  return useMemo(() => translator(dictionary), [dictionary]);
}

/**
 * A translated sentence with elements in its {slots}, wherever each language
 * puts them: fill(t("Type {word} to finish early."), { word: <Keyword … /> }).
 */
export function fill(text: string, parts: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((piece, index) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    return <Fragment key={index}>{name && name in parts ? parts[name] : piece}</Fragment>;
  });
}
