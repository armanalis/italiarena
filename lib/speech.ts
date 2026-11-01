/**
 * Pronunciation with the browser's own voices (Web Speech API): free, no key,
 * Italian and German voices ship on iPhone, Android, Mac and Windows.
 * Tested by scripts/test-speech.ts.
 */
import { LANGUAGE_META, type TargetLanguage } from "@/lib/constants";

/** The voice for this language: its home region first (it-IT, de-DE), then any other (de-AT, it-CH). */
export function pickVoice<V extends { lang: string }>(
  voices: readonly V[],
  language: TargetLanguage
): V | undefined {
  const code = LANGUAGE_META[language].code;
  // Some Android voices write it_IT.
  const tag = (voice: V) => voice.lang.replace("_", "-").toLowerCase();
  return (
    voices.find((voice) => tag(voice) === `${code}-${code}`) ??
    voices.find((voice) => tag(voice).split("-")[0] === code)
  );
}

/**
 * The part of a quiz question that is in the language it teaches, null when
 * there is none to read: "What does 'der Strand' mean?" → "der Strand";
 * "Complete: 'Questa è ___ (my) macchina.'" + "la mia" → "Questa è la mia macchina."
 * Other questions quote English ("How do you say 'thank you'?"), so they get no audio.
 */
export function speakableQuestion(questionText: string, correctOptionText: string): string | null {
  // Hints in brackets are English or repeat the answer: "(my)", "(polite request)".
  const text = questionText.replace(/\s*\([^)]*\)/g, "").trim();
  // Inside the word an apostrophe is only an elision (l'albero), never a closing quote.
  const word = text.match(/^What (?:does|is) (?:the \w+ )?'((?:[^']|'(?=\p{L}))+)'(?: mean)?(?: in '(.+)')?\?$/u);
  // "What does 'günstig' mean in 'Die Wohnung ist günstig'?" reads the whole example.
  if (word) return word[2] ?? word[1];

  const sentence = text.match(/^[A-Z][^']*: '(.+)'$/)?.[1] ?? text;
  const answer = correctOptionText.trim();
  if (sentence.match(/_{2,}/g)?.length !== 1 || !answer) return null;
  // An elided answer joins the next word: "L'" + "___ arancia" → "L'arancia".
  const elided = /['’]$/.test(answer);
  return sentence.replace(elided ? /_{2,}\s*/ : /_{2,}/, answer).replace(/\s+/g, " ");
}

export function subscribeToVoices(onChange: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  // Chrome loads its voices after the page; this event says they arrived.
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

export function hasVoice(language: TargetLanguage) {
  return "speechSynthesis" in window && Boolean(pickVoice(window.speechSynthesis.getVoices(), language));
}

export function speak(text: string, language: TargetLanguage) {
  const voice = pickVoice(window.speechSynthesis.getVoices(), language);
  if (!voice) return;
  // A second tap restarts the word instead of queueing it.
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9; // a touch slower than normal speech, for learners
  window.speechSynthesis.speak(utterance);
}
