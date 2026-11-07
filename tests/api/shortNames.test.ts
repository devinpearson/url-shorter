import { describe, expect, it } from "vitest";
import {
  ADJECTIVES,
  generateShortName,
  isValidShortName,
  NOUNS,
  normalizeShortName,
} from "../../backend/src/shortNames";
import {
  normalizeShortName as normalizeInBrowser,
  shortNameProblem,
  tidyShortNameInput,
} from "../../src/lib/shortNames";

describe("generated names", () => {
  it("have 64 different, lowercase, plain words in each list", () => {
    for (const list of [ADJECTIVES, NOUNS]) {
      expect(new Set(list).size).toBe(64);
      for (const word of list) expect(word).toMatch(/^[a-z]{3,8}$/);
    }
  });

  it("look like brave-otter-47 and are always valid", () => {
    for (let i = 0; i < 500; i++) {
      const name = generateShortName();
      expect(name).toMatch(/^[a-z]+-[a-z]+-[2-9]{2}$/);
      expect(isValidShortName(name)).toBe(true);
    }
  });

  it("never contain digits that look like letters (0, 1)", () => {
    for (let i = 0; i < 500; i++) expect(generateShortName()).not.toMatch(/[01]/);
  });
});

describe("normalizing names", () => {
  it.each([
    ["Sunrise Speakers", "sunrise-speakers"],
    ["  ZOOM_link ", "zoom-link"],
    ["a  --  b", "a-b"],
    ["-edge-", "edge"],
  ])("turns %j into %j, the same in the API and the browser", (input, expected) => {
    expect(normalizeShortName(input)).toBe(expected);
    expect(normalizeInBrowser(input)).toBe(expected);
  });

  it("keeps a trailing dash while typing so you can keep going", () => {
    expect(tidyShortNameInput("Sunrise ")).toBe("sunrise-");
  });

  it.each([
    ["ab", /at least 3/],
    ["a/b", /letters, numbers and dashes/],
    ["x".repeat(33), /32 characters or fewer/],
    ["club-roles", null],
    ["", null],
  ])("explains what's wrong with %j", (name, problem) => {
    const result = shortNameProblem(name);
    if (problem) expect(result).toMatch(problem);
    else expect(result).toBeNull();
  });
});
