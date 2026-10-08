/**
 * Desktop sidebar width, chosen by dragging its edge. Stored per browser and
 * applied as the `--sidebar-width` CSS variable on <html>; `.dashboard-sidebar`
 * in app/globals.css clamps it again so the sidebar can never vanish or
 * swallow the page, whatever was saved.
 */

export const SIDEBAR_WIDTH_STORAGE_KEY = "italiarena:sidebar-width";
export const SIDEBAR_WIDTH_VARIABLE = "--sidebar-width";

/** Narrowest width that still fits an icon plus "Leaderboard". Keep in sync with globals.css. */
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 420;
/** Never wider than this share of the window. Keep in sync with globals.css. */
export const SIDEBAR_MAX_VIEWPORT_SHARE = 0.4;

export function clampSidebarWidth(width: number, viewportWidth: number): number {
  const max = Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.min(SIDEBAR_MAX_WIDTH, viewportWidth * SIDEBAR_MAX_VIEWPORT_SHARE)
  );
  return Math.round(Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, width)));
}

/**
 * Runs before first paint (app/layout.tsx) so a saved width shows
 * immediately instead of jumping after hydration.
 */
export const SIDEBAR_WIDTH_BOOT_SCRIPT = `try{var w=parseInt(localStorage.getItem("${SIDEBAR_WIDTH_STORAGE_KEY}")||"",10);if(w>0)document.documentElement.style.setProperty("${SIDEBAR_WIDTH_VARIABLE}",w+"px")}catch(e){}`;
