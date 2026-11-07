import axios, { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiErrorMessage,
  createShortUrl,
  savePendingLink,
  shortLinkLabel,
  takePendingLink,
  takeReturnTo,
} from "./api";

function axiosError(status: number, message?: string) {
  const headers = new AxiosHeaders();
  return new AxiosError("failed", "ERR", undefined, undefined, {
    status,
    statusText: "",
    headers,
    config: { headers },
    data: message ? { message } : {},
  });
}

afterEach(() => vi.restoreAllMocks());

describe("apiErrorMessage", () => {
  it.each([
    [409, undefined, /already taken/],
    [401, undefined, /log in/],
    [429, "Slow down", /Slow down/],
    [400, "Please enter a valid URL.", /valid URL/],
    [500, "stack trace", /Something went wrong/],
  ])("turns a %i into a readable message", (status, message, expected) => {
    expect(apiErrorMessage(axiosError(status, message))).toMatch(expected);
  });

  it("handles errors that aren't from the API", () => {
    expect(apiErrorMessage(new Error("boom"))).toMatch(/Something went wrong/);
  });
});

describe("createShortUrl", () => {
  it("trims the input and leaves out an empty custom name", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: { shortId: "abc" } });
    await createShortUrl({ originalUrl: "  https://example.com  ", customShortId: "   " });
    expect(post).toHaveBeenCalledWith("/api/urls", { originalUrl: "https://example.com" });
  });
});

describe("login hand-off", () => {
  it("keeps a pending link through the login redirect, once", () => {
    savePendingLink({ originalUrl: "https://example.com", customShortId: "club" });
    expect(takePendingLink()).toEqual({
      originalUrl: "https://example.com",
      customShortId: "club",
    });
    expect(takePendingLink()).toBeNull();
  });

  it("ignores a corrupt pending link", () => {
    sessionStorage.setItem("pendingShortUrl", "{not json");
    expect(takePendingLink()).toBeNull();
  });

  it.each([
    ["/dashboard", "/dashboard"],
    ["/stats/abc", "/stats/abc"],
    ["//evil.example", null],
    ["https://evil.example", null],
  ])("only returns to in-app paths: %s", (value, expected) => {
    sessionStorage.setItem("postLoginReturnTo", value);
    expect(takeReturnTo()).toBe(expected);
  });
});

describe("shortLinkLabel", () => {
  it("shows the host without the protocol", () => {
    expect(shortLinkLabel("club-roles")).toBe(`${window.location.host}/club-roles`);
  });
});
