import type { TargetLanguage } from "@/lib/constants";

/** Named after the buttons. The same in every app language. */
export const PREPOSITION_GAME_NAME = {
  English: "in·on·at",
  Italian: "di·a·da",
  German: "in·an·auf",
} as const satisfies Record<TargetLanguage, string>;

/** KEEP IN SYNC with article_sprint_ms('preposition') in the database. */
export const PREPOSITION_MS = 90_000;

/**
 * Rule id → one English sentence. Claude fills the sentences in.
 * An id that is not here is shown as nothing.
 */
export const PREPOSITION_RULES: Record<string, string> = {
  "en-time-in": "in: months, years, seasons, parts of the day, and time from now (in May, in 2020, in the morning, in ten minutes)",
  "en-time-on": "on: days and dates (on Monday, on 5 May, on my birthday)",
  "en-time-at": "at: clock times, night, the weekend, the moment (at six, at night)",
  "en-place-in": "in: inside a space, a town or a country (in the box, in London, in Italy)",
  "en-place-on": "on: a surface, a floor, a coast, a screen (on the table, on the wall, on TV)",
  "en-place-at": "at: a point or a place where something happens (at the door, at school, at work)",
  "en-move-to": "to: movement towards a place (go to school, fly to Paris)",
  "en-move-into": "into / out of: movement in or out; onto / off: movement on or off a surface, a bus, a train",
  "en-move-across": "across: from one side to the other; through: inside and out again; along: following a line; up / down",
  "en-from": "from: where something starts or comes from (from Spain, from nine to five)",
  "en-transport": "by + transport, with no article (by bus, by car); but on foot",
  "en-with": "with: together with someone, or using a thing (with my parents, with a pen)",
  "en-for": "for: who gets something, or the reason for thanks (for you, thank you for)",
  "en-of": "of: a part, an amount or belonging (a cup of tea, the name of the dog)",
  "en-about": "about: the subject of a book, a talk or a thought",
  "en-position": "position words: under, over, behind, between, opposite, next to, in front of",
  "en-for-since": "for + a length of time (for two years); since + the starting point (since 2019)",
  "en-by-until": "by: not later than (finish by Friday); until: up to that time (open until ten)",
  "en-during": "during + noun (during the film); for + how long; while + a clause",
  "en-by-agent": "by: who did it, in the passive (written by Orwell)",
  "en-adjective": "adjective + its own preposition: good at, afraid of, interested in, keen on, different from",
  "en-verb": "verb + its own preposition: listen to, wait for, depend on, arrive at / in, look after",
  "en-noun": "noun + its own preposition: reason for, solution to, increase in, damage to",
  "en-phrase": "a fixed phrase: learn it whole (on holiday, by chance, in a hurry, under control)",
  "en-formal": "a formal fixed phrase (on behalf of, in accordance with, with regard to)",
};
