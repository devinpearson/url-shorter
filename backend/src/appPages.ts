/**
 * Pages the React app serves at a single path segment (see src/main.tsx). Requests for these,
 * in any letter case, get the app; any other single segment is treated as a short link.
 * Used by the backend, the reserved-name check and the Vite dev/preview proxy (vite.config.ts).
 */
export const APP_PAGES = [
  "dashboard",
  "login",
  "about",
  "contact",
  "terms",
  "stats",
  "clubs",
  "join",
] as const;

/**
 * Pages with a second segment: /stats/<link>, /clubs/<club>, /join/<invite> and the public club
 * pages /c/<club>. ("c" is too short to be a short name, so it needs no reserving.)
 */
const NESTED_PAGES = new Set(["stats", "clubs", "join", "c"]);

/** True for "/", the app pages above and their nested pages, in any letter case. */
export function isAppPagePath(path: string): boolean {
  const segments = path.toLowerCase().split("/").filter(Boolean);
  if (segments.length === 0) return true;
  if (segments.length === 2) return NESTED_PAGES.has(segments[0]);
  return segments.length === 1 && (APP_PAGES as readonly string[]).includes(segments[0]);
}
