export const REGULAR_MATCH_QUESTIONS = 10;

export function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function splitSessionQuestions<T extends { id: string }>(questions: T[]) {
  return {
    regular: questions.slice(0, REGULAR_MATCH_QUESTIONS),
  };
}
