/** Full-page navigation — avoids Next.js router init races with useActionState. */
export function navigateTo(url: string) {
  window.location.assign(url);
}
