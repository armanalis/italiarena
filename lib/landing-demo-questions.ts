/**
 * A2 sample questions for the landing-page demo match.
 *
 * Picked on the server per request, so the pool never ships to the browser
 * and server and client render the same three questions (no hydration mismatch).
 * 52 questions → 22,100 possible sets of three.
 */

export type DemoCategory = "Grammar" | "Fill in the blank" | "Vocabulary" | "Idioms";

type PoolQuestion = {
  id: string;
  category: DemoCategory;
  /** Italian. "___" marks the blank. */
  prompt: string;
  /** English help line shown under the prompt. */
  hint: string;
  answer: string;
  /** Most tempting wrong option — the demo player picks it on its wrong turn. */
  trap: string;
  distractors: [string, string];
};

export type DemoQuestion = {
  id: string;
  category: DemoCategory;
  prompt: string;
  hint: string;
  options: string[];
  optionsLang: "it" | "en";
  correct: number;
  trap: number;
};

const MEANING = "What does it mean?";

const POOL: PoolQuestion[] = [
  // Grammar
  {
    id: "g01",
    category: "Grammar",
    prompt: "Ieri noi ___ al cinema.",
    hint: "Yesterday we went to the cinema.",
    answer: "siamo andati",
    trap: "abbiamo andato",
    distractors: ["siamo andato", "andiamo"],
  },
  {
    id: "g02",
    category: "Grammar",
    prompt: "Maria ___ alle sette ogni mattina.",
    hint: "Maria gets up at seven every morning.",
    answer: "si alza",
    trap: "alza",
    distractors: ["si alzano", "ti alzi"],
  },
  {
    id: "g03",
    category: "Grammar",
    prompt: "Questo è ___ libro di Paolo.",
    hint: "This is Paolo's book.",
    answer: "il",
    trap: "lo",
    distractors: ["la", "l'"],
  },
  {
    id: "g04",
    category: "Grammar",
    prompt: "Ho comprato ___ zaino nuovo.",
    hint: "I bought a new backpack.",
    answer: "uno",
    trap: "un",
    distractors: ["una", "un'"],
  },
  {
    id: "g05",
    category: "Grammar",
    prompt: "Vedi Luca stasera? Sì, ___ vedo alle otto.",
    hint: "Are you seeing Luca tonight? Yes, I'm seeing him at eight.",
    answer: "lo",
    trap: "gli",
    distractors: ["la", "li"],
  },
  {
    id: "g06",
    category: "Grammar",
    prompt: "Telefono a Giulia e ___ dico la verità.",
    hint: "I call Giulia and tell her the truth.",
    answer: "le",
    trap: "la",
    distractors: ["gli", "lo"],
  },
  {
    id: "g07",
    category: "Grammar",
    prompt: "Roma è ___ grande di Firenze.",
    hint: "Rome is bigger than Florence.",
    answer: "più",
    trap: "molto",
    distractors: ["tanto", "così"],
  },
  {
    id: "g08",
    category: "Grammar",
    prompt: "Quando ero bambino, ___ sempre al parco.",
    hint: "When I was a child, I always played in the park.",
    answer: "giocavo",
    trap: "ho giocato",
    distractors: ["gioco", "giocherò"],
  },
  {
    id: "g09",
    category: "Grammar",
    prompt: "Questa è ___ madre.",
    hint: "This is my mother.",
    answer: "mia",
    trap: "la mia",
    distractors: ["mio", "il mio"],
  },
  {
    id: "g10",
    category: "Grammar",
    prompt: "Ti presento ___ sorelle.",
    hint: "Let me introduce my sisters.",
    answer: "le mie",
    trap: "mie",
    distractors: ["i miei", "la mia"],
  },
  {
    id: "g11",
    category: "Grammar",
    prompt: "Stamattina Anna ___ colazione alle otto.",
    hint: "This morning Anna had breakfast at eight.",
    answer: "ha fatto",
    trap: "è fatta",
    distractors: ["ha fatta", "è fatto"],
  },
  {
    id: "g12",
    category: "Grammar",
    prompt: "C'è ___ latte in frigo?",
    hint: "Is there any milk in the fridge?",
    answer: "del",
    trap: "dello",
    distractors: ["della", "dei"],
  },
  {
    id: "g13",
    category: "Grammar",
    prompt: "Luisa e Marta ___ partite ieri sera.",
    hint: "Luisa and Marta left last night.",
    answer: "sono",
    trap: "hanno",
    distractors: ["è", "ha"],
  },

  // Fill in the blank
  {
    id: "f01",
    category: "Fill in the blank",
    prompt: "Non vedo l'ora ___ vederti.",
    hint: "I can't wait to see you.",
    answer: "di",
    trap: "a",
    distractors: ["da", "per"],
  },
  {
    id: "f02",
    category: "Fill in the blank",
    prompt: "Abito ___ Torino da due anni.",
    hint: "I've lived in Turin for two years.",
    answer: "a",
    trap: "in",
    distractors: ["da", "su"],
  },
  {
    id: "f03",
    category: "Fill in the blank",
    prompt: "Quest'estate vado ___ Italia.",
    hint: "This summer I'm going to Italy.",
    answer: "in",
    trap: "a",
    distractors: ["da", "per"],
  },
  {
    id: "f04",
    category: "Fill in the blank",
    prompt: "Stasera vado ___ Marco per cena.",
    hint: "Tonight I'm going to Marco's place for dinner.",
    answer: "da",
    trap: "a",
    distractors: ["in", "di"],
  },
  {
    id: "f05",
    category: "Fill in the blank",
    prompt: "Il treno parte ___ binario 3.",
    hint: "The train leaves from platform 3.",
    answer: "dal",
    trap: "al",
    distractors: ["nel", "sul"],
  },
  {
    id: "f06",
    category: "Fill in the blank",
    prompt: "Studio italiano ___ sei mesi.",
    hint: "I've been studying Italian for six months (and still am).",
    answer: "da",
    trap: "per",
    distractors: ["fa", "tra"],
  },
  {
    id: "f07",
    category: "Fill in the blank",
    prompt: "Sono arrivato in Italia due anni ___.",
    hint: "I arrived in Italy two years ago.",
    answer: "fa",
    trap: "da",
    distractors: ["tra", "dopo"],
  },
  {
    id: "f08",
    category: "Fill in the blank",
    prompt: "Ci vediamo ___ una settimana.",
    hint: "See you in a week.",
    answer: "tra",
    trap: "fa",
    distractors: ["da", "per"],
  },
  {
    id: "f09",
    category: "Fill in the blank",
    prompt: "Mi piace ___ pizza napoletana.",
    hint: "I like Neapolitan pizza.",
    answer: "la",
    trap: "il",
    distractors: ["lo", "i"],
  },
  {
    id: "f10",
    category: "Fill in the blank",
    prompt: "A che ora ___ il negozio?",
    hint: "What time does the shop open?",
    answer: "apre",
    trap: "aprono",
    distractors: ["aperto", "apri"],
  },
  {
    id: "f11",
    category: "Fill in the blank",
    prompt: "Scusi, dov'è ___ fermata dell'autobus?",
    hint: "Excuse me, where is the bus stop?",
    answer: "la",
    trap: "il",
    distractors: ["lo", "l'"],
  },
  {
    id: "f12",
    category: "Fill in the blank",
    prompt: "Ho bisogno ___ aiuto.",
    hint: "I need help.",
    answer: "di",
    trap: "per",
    distractors: ["a", "da"],
  },
  {
    id: "f13",
    category: "Fill in the blank",
    prompt: "Il caffè ___ piace molto.",
    hint: "I really like coffee.",
    answer: "mi",
    trap: "io",
    distractors: ["me", "ti"],
  },

  // Vocabulary
  {
    id: "v01",
    category: "Vocabulary",
    prompt: "la fermata",
    hint: MEANING,
    answer: "the stop",
    trap: "the farm",
    distractors: ["the signature", "the station"],
  },
  {
    id: "v02",
    category: "Vocabulary",
    prompt: "la camera",
    hint: MEANING,
    answer: "the bedroom",
    trap: "the camera",
    distractors: ["the waitress", "the car"],
  },
  {
    id: "v03",
    category: "Vocabulary",
    prompt: "la libreria",
    hint: MEANING,
    answer: "the bookshop",
    trap: "the library",
    distractors: ["the freedom", "the scale"],
  },
  {
    id: "v04",
    category: "Vocabulary",
    prompt: "il parente",
    hint: MEANING,
    answer: "the relative",
    trap: "the parent",
    distractors: ["the wall", "the flat"],
  },
  {
    id: "v05",
    category: "Vocabulary",
    prompt: "morbido",
    hint: MEANING,
    answer: "soft",
    trap: "morbid",
    distractors: ["heavy", "sad"],
  },
  {
    id: "v06",
    category: "Vocabulary",
    prompt: "annoiato",
    hint: MEANING,
    answer: "bored",
    trap: "annoyed",
    distractors: ["anxious", "tired"],
  },
  {
    id: "v07",
    category: "Vocabulary",
    prompt: "il bicchiere",
    hint: MEANING,
    answer: "the glass",
    trap: "the bicycle",
    distractors: ["the bottle", "the cup"],
  },
  {
    id: "v08",
    category: "Vocabulary",
    prompt: "lo scontrino",
    hint: MEANING,
    answer: "the receipt",
    trap: "the discount",
    distractors: ["the meeting", "the change"],
  },
  {
    id: "v09",
    category: "Vocabulary",
    prompt: "il cappello",
    hint: MEANING,
    answer: "the hat",
    trap: "the hair",
    distractors: ["the coat", "the chapel"],
  },
  {
    id: "v10",
    category: "Vocabulary",
    prompt: "la tasca",
    hint: MEANING,
    answer: "the pocket",
    trap: "the task",
    distractors: ["the bag", "the cup"],
  },
  {
    id: "v11",
    category: "Vocabulary",
    prompt: "il cameriere",
    hint: MEANING,
    answer: "the waiter",
    trap: "the cameraman",
    distractors: ["the roommate", "the cook"],
  },
  {
    id: "v12",
    category: "Vocabulary",
    prompt: "affittare",
    hint: MEANING,
    answer: "to rent",
    trap: "to fit",
    distractors: ["to sell", "to borrow"],
  },
  {
    id: "v13",
    category: "Vocabulary",
    prompt: "il biglietto",
    hint: MEANING,
    answer: "the ticket",
    trap: "the bill",
    distractors: ["the wallet", "the envelope"],
  },

  // Idioms
  {
    id: "i01",
    category: "Idioms",
    prompt: "In bocca al lupo!",
    hint: "Literally “into the wolf's mouth.” What does it mean?",
    answer: "Good luck!",
    trap: "Be careful!",
    distractors: ["Enjoy your meal!", "Hurry up!"],
  },
  {
    id: "i02",
    category: "Idioms",
    prompt: "Costa un occhio della testa.",
    hint: "Literally “it costs an eye from the head.” What does it mean?",
    answer: "It's very expensive.",
    trap: "It's hard to see.",
    distractors: ["It's a bargain.", "It gives me a headache."],
  },
  {
    id: "i03",
    category: "Idioms",
    prompt: "Acqua in bocca!",
    hint: "Literally “water in the mouth.” What does it mean?",
    answer: "Keep it secret!",
    trap: "I'm thirsty!",
    distractors: ["Drink slowly!", "Speak up!"],
  },
  {
    id: "i04",
    category: "Idioms",
    prompt: "Sono al verde.",
    hint: "Literally “I'm at the green.” What does it mean?",
    answer: "I'm broke.",
    trap: "I'm inexperienced.",
    distractors: ["I'm jealous.", "I feel sick."],
  },
  {
    id: "i05",
    category: "Idioms",
    prompt: "Che barba!",
    hint: "Literally “what a beard!” What does it mean?",
    answer: "How boring!",
    trap: "How old!",
    distractors: ["How strange!", "How lucky!"],
  },
  {
    id: "i06",
    category: "Idioms",
    prompt: "Facciamo due passi?",
    hint: "Literally “shall we make two steps?” What does it mean?",
    answer: "Shall we go for a short walk?",
    trap: "Shall we dance?",
    distractors: ["Shall we take the stairs?", "Shall we hurry?"],
  },
  {
    id: "i07",
    category: "Idioms",
    prompt: "Ho una fame da lupi.",
    hint: "Literally “I have a wolves' hunger.” What does it mean?",
    answer: "I'm starving.",
    trap: "I'm angry.",
    distractors: ["I'm scared.", "I'm lonely."],
  },
  {
    id: "i08",
    category: "Idioms",
    prompt: "Piove a catinelle.",
    hint: "Literally “it's raining by the basinful.” What does it mean?",
    answer: "It's pouring.",
    trap: "It's drizzling.",
    distractors: ["It's snowing.", "It's getting cold."],
  },
  {
    id: "i09",
    category: "Idioms",
    prompt: "Dorme come un ghiro.",
    hint: "Literally “he sleeps like a dormouse.” What does it mean?",
    answer: "He sleeps very deeply.",
    trap: "He sleeps badly.",
    distractors: ["He takes short naps.", "He snores loudly."],
  },
  {
    id: "i10",
    category: "Idioms",
    prompt: "Giulia è in gamba.",
    hint: "Literally “Giulia is in leg.” What does it mean?",
    answer: "Giulia is smart and capable.",
    trap: "Giulia is in a hurry.",
    distractors: ["Giulia is injured.", "Giulia is standing up."],
  },
  {
    id: "i11",
    category: "Idioms",
    prompt: "Devo fare la spesa.",
    hint: "Literally “I have to do the expense.” What does it mean?",
    answer: "I have to buy groceries.",
    trap: "I have to pay the bill.",
    distractors: ["I have to save money.", "I have to go on holiday."],
  },
  {
    id: "i12",
    category: "Idioms",
    prompt: "Ho sonno.",
    hint: "Literally “I have sleep.” What does it mean?",
    answer: "I'm sleepy.",
    trap: "I'm dreaming.",
    distractors: ["I'm bored.", "I'm lazy."],
  },
  {
    id: "i13",
    category: "Idioms",
    prompt: "Meno male!",
    hint: "Literally “less bad!” What does it mean?",
    answer: "Thank goodness!",
    trap: "Too bad!",
    distractors: ["Not bad at all!", "Get well soon!"],
  },
];

/** Opponent names for the landing demo — five women, five men. */
const OPPONENT_NAMES = [
  "Giulia",
  "Sofia",
  "Chiara",
  "Martina",
  "Francesca",
  "Marco",
  "Luca",
  "Matteo",
  "Lorenzo",
  "Davide",
] as const;

/** Random opponent, picked per request like the questions. */
export function pickDemoOpponent(): string {
  return OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Random questions without repeats, each with its options shuffled. */
export function pickDemoQuestions(count = 3): DemoQuestion[] {
  return shuffle(POOL)
    .slice(0, count)
    .map(({ answer, trap, distractors, ...question }) => {
      const options = shuffle([answer, trap, ...distractors]);
      return {
        ...question,
        options,
        optionsLang:
          question.category === "Vocabulary" || question.category === "Idioms"
            ? "en"
            : "it",
        correct: options.indexOf(answer),
        trap: options.indexOf(trap),
      };
    });
}
