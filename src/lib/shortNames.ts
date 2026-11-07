/**
 * Short names are lowercase letters, numbers and single dashes, so they are easy to read off
 * a poster and type. Keep in sync with backend/src/shortNames.ts.
 */
const SHORT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Tidies a name while it's being typed: lowercase, and spaces or underscores become dashes.
 * A trailing dash is kept so "sunrise-" can still become "sunrise-zoom".
 */
export function tidyShortNameInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "");
}

/** The final name: "Sunrise Speakers " → "sunrise-speakers". */
export function normalizeShortName(input: string): string {
  return tidyShortNameInput(input.trim()).replace(/-+$/, "");
}

/** Why a (normalized) name can't be used, in plain words, or null when it's fine. */
export function shortNameProblem(name: string): string | null {
  if (!name) return null;
  if (!SHORT_NAME_PATTERN.test(name)) return "Use only letters, numbers and dashes.";
  if (name.length < 3) return "Use at least 3 characters.";
  if (name.length > 32) return "Use 32 characters or fewer.";
  return null;
}
