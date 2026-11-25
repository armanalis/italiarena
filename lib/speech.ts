/**
 * Pronunciation with the browser's own voices (Web Speech API): free, no key,
 * Italian and German voices ship on iPhone, Android, Mac and Windows.
 * Tested by scripts/test-speech.ts.
 */
import { LANGUAGE_META, type TargetLanguage } from "@/lib/constants";

/** Home-region tag. Italian and German match language-country; English does not (en-US, not en-EN). */
const HOME_VOICE: Record<TargetLanguage, string> = {
  Italian: "it-it",
  German: "de-de",
  English: "en-us",
  Spanish: "es-es",
  Danish: "da-dk",
};

/** The voice for this language: its home region first (it-IT, de-DE, en-US), then any other. */
export function pickVoice<V extends { lang: string }>(
  voices: readonly V[],
  language: TargetLanguage
): V | undefined {
  const code = LANGUAGE_META[language].code;
  // Some Android voices write it_IT.
  const tag = (voice: V) => voice.lang.replace("_", "-").toLowerCase();
  return (
    voices.find((voice) => tag(voice) === HOME_VOICE[language]) ??
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

/**
 * How to speak this language on this device: a voice, or only a lang tag while the device has
 * not listed its voices yet (iPhone often lists none at first; the lang tag still picks one).
 * Null when the voices are listed and none speaks the language.
 */
export function voiceFor<V extends { lang: string }>(
  voices: readonly V[],
  language: TargetLanguage
): { voice?: V; lang: string } | null {
  if (voices.length === 0) {
    const [code, region] = HOME_VOICE[language].split("-");
    return { lang: `${code}-${region.toUpperCase()}` };
  }
  const voice = pickVoice(voices, language);
  return voice ? { voice, lang: voice.lang.replace("_", "-") } : null;
}

export function subscribeToVoices(onChange: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  // Chrome loads its voices after the page; this event says they arrived. Safari on iPhone
  // may never send it, so look again a little later too.
  window.speechSynthesis.addEventListener?.("voiceschanged", onChange);
  const timers = [500, 2000].map((ms) => window.setTimeout(onChange, ms));
  return () => {
    window.speechSynthesis.removeEventListener?.("voiceschanged", onChange);
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}

export function hasVoice(language: TargetLanguage) {
  return "speechSynthesis" in window && voiceFor(window.speechSynthesis.getVoices(), language) !== null;
}

/** 0.02 s of silence (8 kHz, 8-bit WAV). */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";
let silentClip: HTMLAudioElement | undefined;

/**
 * iPhone and iPad keep speech silent while the ring/silent switch is on, because a page that has
 * played no media gets the "ambient" audio category. Asking for "playback" and playing a silent
 * clip inside the same tap moves it to the category the switch does not mute.
 */
function leaveSilentMode() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "playback"; // Safari 16.4+
  // Every iOS browser is WebKit; iPadOS reports itself as a Mac with touch.
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
  if (!ios) return; // elsewhere the clip would only show up in Now Playing
  silentClip ??= new Audio(SILENT_WAV);
  silentClip.play().catch(() => {});
}

export function speak(text: string, language: TargetLanguage) {
  const synth = window.speechSynthesis;
  const how = voiceFor(synth.getVoices(), language);
  if (!how) return;
  leaveSilentMode();
  // A second tap restarts the word instead of queueing it. Only when something is playing:
  // Safari on iPhone and some Android browsers drop a speak() that comes right after cancel().
  if (synth.speaking || synth.pending) synth.cancel();
  // Chrome on Android can stay paused after the page was in the background.
  if (synth.paused) synth.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  if (how.voice) utterance.voice = how.voice as unknown as SpeechSynthesisVoice;
  utterance.lang = how.lang;
  utterance.rate = 0.9; // a touch slower than normal speech, for learners
  synth.speak(utterance);
}
