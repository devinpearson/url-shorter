/**
 * Pages the React app serves at a single path segment (see src/main.tsx). Requests for these,
 * in any letter case, get the app; any other single segment is treated as a short link.
 * Used by the backend, the reserved-name check and the Vite dev/preview proxy (vite.config.ts).
 */
export const APP_PAGES = ["dashboard", "login", "about", "contact", "terms", "stats"] as const;

/** True for "/", the app pages above and /stats/<name>, in any letter case. */
export function isAppPagePath(path: string): boolean {
  const segments = path.toLowerCase().split("/").filter(Boolean);
  if (segments.length === 0) return true;
  if (segments[0] === "stats") return segments.length <= 2;
  return segments.length === 1 && (APP_PAGES as readonly string[]).includes(segments[0]);
}
