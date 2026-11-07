import { describe, expect, it } from "vitest";
import { isAppPagePath } from "../../backend/src/appPages";

describe("isAppPagePath", () => {
  it.each([
    ["/", true],
    ["/dashboard", true],
    ["/About", true],
    ["/stats", true],
    ["/stats/club-roles", true],
    ["/stats/a/b", false],
    ["/club-roles", false],
    ["/aboutus", false],
    ["/favicon.svg", false],
  ])("%s → %s", (route, expected) => {
    expect(isAppPagePath(route)).toBe(expected);
  });
});
