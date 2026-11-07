import { randomInt } from "node:crypto";

/**
 * Short names have to survive being printed on a poster and typed in by someone else, so
 * they are lowercase, case-insensitive, and use only letters, numbers and single dashes.
 * Keep in sync with src/lib/shortNames.ts and the CHECK in backend/migrations.
 */
const SHORT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHORT_NAME_MIN = 3;
const SHORT_NAME_MAX = 32;

/**
 * Turns what someone typed into a short name: "Sunrise Speakers" → "sunrise-speakers".
 * Lowercases, turns spaces and underscores into dashes, and trims stray dashes. Anything
 * else that isn't allowed is left in place so validation can explain it.
 */
export function normalizeShortName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidShortName(name: string): boolean {
  return (
    name.length >= SHORT_NAME_MIN && name.length <= SHORT_NAME_MAX && SHORT_NAME_PATTERN.test(name)
  );
}

// Simple, common words that are easy to spell and to say aloud, with no homophones
// (so no "deer"/"dear" or "whale"/"wail") and no UK/US spelling differences.
// biome-ignore format: word lists read better in rows
export const ADJECTIVES = [
  "brave", "bright", "calm", "clever", "happy", "jolly", "kind", "lucky",
  "merry", "proud", "quick", "quiet", "sunny", "swift", "warm", "wise",
  "bold", "busy", "cheery", "eager", "gentle", "grand", "keen", "lively",
  "mighty", "neat", "noble", "polite", "rapid", "ready", "royal", "smart",
  "smooth", "steady", "super", "sweet", "tidy", "upbeat", "vivid", "witty",
  "cool", "fresh", "golden", "great", "honest", "loyal", "magic", "modern",
  "rosy", "shiny", "silver", "snappy", "sporty", "stellar", "tall", "true",
  "fair", "glad", "brisk", "crisp", "early", "epic", "friendly", "cosmic",
] as const;

// biome-ignore format: word lists read better in rows
export const NOUNS = [
  "otter", "lion", "tiger", "panda", "koala", "eagle", "falcon", "robin",
  "parrot", "dolphin", "turtle", "rabbit", "badger", "beaver", "bison", "camel",
  "cheetah", "duck", "fox", "frog", "gecko", "goose", "hawk", "heron",
  "horse", "lemur", "llama", "moose", "owl", "pony", "puffin", "raven",
  "seal", "shark", "sheep", "swan", "wolf", "zebra", "maple", "cedar",
  "river", "ocean", "meadow", "comet", "planet", "rocket", "garden", "island",
  "valley", "summit", "canyon", "forest", "breeze", "sunrise", "rainbow", "lantern",
  "compass", "anchor", "beacon", "pebble", "acorn", "bridge", "castle", "tulip",
] as const;

/** Digits that can't be mistaken for letters: no 0 (o) or 1 (l, i). */
const CLEAR_DIGITS = "23456789";

/**
 * A readable random name like "brave-otter-47": two everyday words and a two-digit number.
 * 64 × 64 × 64 = 262,144 combinations; callers retry on the rare collision.
 */
export function generateShortName(): string {
  const pick = <T>(list: readonly T[]) => list[randomInt(list.length)];
  const digits = pick([...CLEAR_DIGITS]) + pick([...CLEAR_DIGITS]);
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${digits}`;
}
