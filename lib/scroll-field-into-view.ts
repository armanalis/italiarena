/** Scroll a focused field above the mobile keyboard (iOS Safari / Android Chrome). */
export function scrollFieldIntoView(element: HTMLElement) {
  requestAnimationFrame(() => {
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
