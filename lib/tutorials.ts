/**
 * "How to play" for each game: a title and a few short steps, in English.
 * Show every text through t(); Turkish and Italian are in the dictionaries.
 * The names are the ones get_my_tutorials() and mark_tutorial_seen() use.
 */
export const TUTORIAL_GAMES = ["arena", "wordle", "word_wheel", "articles", "indefinite", "prepositions", "picture_duel"] as const;
export type TutorialGame = (typeof TUTORIAL_GAMES)[number];

export const TUTORIALS: Record<TutorialGame, { title: string; steps: string[] }> = {
  arena: {
    title: "How the Arena works",
    steps: [
      "You play a live match of 10 questions against a player of your level. If nobody is free, you can play a bot.",
      "Both of you get the same question and 25 seconds. Pick one of the four answers.",
      "A right answer gives points, and a faster one gives more: up to 140 for each question.",
      "After the match you can go through your mistakes and ask the AI why an answer is right.",
    ],
  },
  wordle: {
    title: "How Wordle works",
    steps: [
      "Guess the 5-letter word in 6 tries. Every guess must be a real word.",
      "Green: the letter is in the right place. Yellow: it is in the word, but in another place. Grey: it is not in the word.",
      "There is one puzzle a day for each level. At the end you see what the word means.",
      "Missed a day? Open a past puzzle from the list under the game.",
    ],
  },
  word_wheel: {
    title: "How the Word Wheel works",
    steps: [
      "You get one clue for every letter and 5 minutes for the whole wheel. The answer starts with that letter.",
      "Type the word and press Enter. Type {pass} to skip a letter; it comes back when the others are done. Type {finish} to finish early.",
      "Normal mode forgives one wrong letter in a word. Hard mode wants the exact word.",
      "There is one wheel a day for each level. Past days are in the list under the game.",
    ],
  },
  articles: {
    title: "How the articles Sprint works",
    steps: [
      "A noun appears. Press its article as fast as you can. Keys 1, 2, 3 and 4 work too.",
      "You have 60 seconds. Every 5 right answers in a row add 1 second.",
      "After a wrong answer you see the right article and, when there is one, the rule behind it.",
      "The first Sprint of the day for each level counts. After that you can practise as much as you like.",
    ],
  },
  indefinite: {
    title: "How un·uno·una works",
    steps: [
      "A noun appears. Press un, uno, una or un'. Only one of them is right. Keys 1, 2, 3 and 4 work too.",
      "You have 60 seconds. Every 5 right answers in a row add 1 second.",
      "un is masculine before a consonant or a vowel. uno is masculine before s + consonant, z, gn, ps, x or y. una is feminine before a consonant. un' is feminine before a vowel.",
      "After a wrong answer you see the right word and the rule behind it.",
      "The first Sprint of the day for each level counts. After that you can practise as much as you like.",
    ],
  },
  prepositions: {
    title: "How the prepositions Sprint works",
    steps: [
      "A sentence appears with one word missing. Press the preposition that fits. Only one of the four is right.",
      "You have 90 seconds. Every 5 right answers in a row add 10 seconds.",
      "After a wrong answer you see the full sentence and the rule behind it.",
      "The first Sprint of the day for each level counts. After that you can practise as much as you like.",
    ],
  },
  picture_duel: {
    title: "How Picture Duel works",
    steps: [
      "You play a friend. Pick a topic and send them the link or the code.",
      "Each of you has 60 seconds, like a chess clock. Type the name of the picture to stop your clock and start theirs.",
      "Pass shows the answer, but your clock keeps running.",
      "Whoever runs out of time first loses. In hard mode you must type the article too.",
    ],
  },
};
