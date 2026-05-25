export const REGULAR_MATCH_QUESTIONS = 10;

export function splitSessionQuestions<T extends { id: string }>(questions: T[]) {
  return {
    regular: questions.slice(0, REGULAR_MATCH_QUESTIONS),
  };
}
