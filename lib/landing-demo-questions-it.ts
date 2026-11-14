/**
 * The landing demo in Italian: each question's help line and, for meaning
 * questions, its options (keyed by question id; lib/landing-demo-questions.ts).
 * Server only, like the pool. Same shape as landing-demo-questions-tr.ts.
 * Italian questions have no entry: a missing entry stays English.
 */

type DemoItalian = { hint: string; answer?: string; trap?: string; distractors?: [string, string] };

const MEANING = "Che cosa significa?";

export const DEMO_IT: Readonly<Record<string, DemoItalian>> = {
  "de-g01": { hint: "Ieri siamo andati al cinema." },
  "de-g02": { hint: "Aspetto l'autobus." },
  "de-g03": { hint: "Questa è la macchina di mio fratello." },
  "de-f01": { hint: "Oggi non ho voglia di cucinare." },
  "de-f02": { hint: "Se ho tempo, vengo anch'io." },
  "de-f03": { hint: "Ci vediamo davanti alla stazione." },
  "de-v01": { hint: MEANING, answer: "la fermata", trap: "l'atrio della stazione", distractors: ["il parcheggio", "l'incrocio"] },
  "de-v02": { hint: MEANING, answer: "ricevere, ottenere", trap: "diventare", distractors: ["tornare", "accogliere"] },
  "de-v03": { hint: MEANING, answer: "la chiave", trap: "la serratura", distractors: ["la porta", "la finestra"] },
  "de-i01": { hint: "Alla lettera: “Ti premo i pollici.” Che cosa significa?", answer: "Incrocio le dita per te!", trap: "Pollice in su, bravo!", distractors: ["Ti chiamo dopo!", "Tieniti forte!"] },
  "de-i02": { hint: "Alla lettera: “Per me è salsiccia.” Che cosa significa?", answer: "Non m'importa.", trap: "Ha un sapore ottimo.", distractors: ["È la cosa peggiore.", "Ho fame."] },
  "de-i03": { hint: "Alla lettera: “Capisco solo stazione.” Che cosa significa?", answer: "Non capisco niente.", trap: "Sono alla stazione.", distractors: ["Mi serve un treno.", "Parlo solo un po'."] },
  "en-g01": { hint: "Ieri siamo andati al cinema." },
  "en-g02": { hint: "Vive a Londra dal 2019." },
  "en-g03": { hint: "Non c'è latte in frigo." },
  "en-f01": { hint: "Non vedo l'ora di vederti." },
  "en-f02": { hint: "Studio inglese da sei mesi." },
  "en-f03": { hint: "Non sono molto bravo in matematica." },
  "en-v01": { hint: MEANING, answer: "la biblioteca", trap: "la libreria", distractors: ["l'elenco dei libri", "la copertina"] },
  "en-v02": { hint: MEANING, answer: "in realtà", trap: "attualmente", distractors: ["velocemente", "per caso"] },
  "en-v03": { hint: MEANING, answer: "assennato, ragionevole", trap: "sensibile", distractors: ["capace di provare dolore", "pieno di significato"] },
  "en-i01": { hint: "Si dice a un attore prima dello spettacolo. Che cosa significa?", answer: "In bocca al lupo!", trap: "Stai attento!", distractors: ["Sbrigati!", "Siediti!"] },
  "en-i02": { hint: "Alla lettera: “È un pezzo di torta.” Che cosa significa?", answer: "È facilissimo.", trap: "Ha un sapore ottimo.", distractors: ["È troppo piccolo.", "È il mio compleanno."] },
  "en-i03": { hint: "Alla lettera: “Sono sotto il tempo.” Che cosa significa?", answer: "Non sto molto bene.", trap: "Sono sotto la pioggia.", distractors: ["Sono molto occupato.", "Amo l'inverno."] },
};
