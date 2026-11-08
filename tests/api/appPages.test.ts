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
    ["/clubs", true],
    ["/clubs/sunrise-speakers", true],
    ["/join/AbC-123", true],
    ["/c/sunrise-speakers", true],
    ["/c", false],
    ["/join", true],
    ["/dashboard/extra", false],
    ["/club-roles", false],
    ["/aboutus", false],
    ["/favicon.svg", false],
  ])("%s → %s", (route, expected) => {
    expect(isAppPagePath(route)).toBe(expected);
  });
});
