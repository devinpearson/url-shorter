import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { renderPage } from "../test/render";
import Landing from "./Landing";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  fetchCurrentUser: vi.fn(),
  createShortUrl: vi.fn(),
  startLogin: vi.fn(),
}));

const officer = { id: "u1", displayName: "Ada", email: "ada@example.com" };
const created = {
  id: "l1",
  shortId: "club-roles",
  originalUrl: "https://example.com/signup",
  clicks: 0,
};

beforeEach(() => vi.resetAllMocks());

describe("Landing", () => {
  it("asks logged-out visitors to log in and shorten", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(null);
    renderPage(<Landing />);
    expect(await screen.findByRole("button", { name: /log in and shorten/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/club meetings/i);
  });

  it("checks the short name as you type", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(officer);
    const { user } = renderPage(<Landing />);
    await user.type(screen.getByLabelText(/paste your long link/i), "https://example.com");
    await user.type(screen.getByLabelText(/short name/i), "bad name!");

    expect(screen.getByText(/use only letters, numbers and dashes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shorten link/i })).toBeDisabled();
  });

  it("tidies a typed name into lowercase with dashes and previews the link", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(officer);
    const { user } = renderPage(<Landing />);
    const name = await screen.findByLabelText(/short name/i);
    await user.type(name, "Sunrise Speakers_Zoom");
    expect(name).toHaveValue("sunrise-speakers-zoom");
    expect(
      screen.getByText(`Your link will be ${window.location.host}/sunrise-speakers-zoom`),
    ).toBeInTheDocument();
  });

  it("sends the tidied name when shortening", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(officer);
    vi.mocked(api.createShortUrl).mockResolvedValue(created);
    const { user } = renderPage(<Landing />);
    await user.type(await screen.findByLabelText(/paste your long link/i), "https://zoom.us/j/1");
    await user.type(screen.getByLabelText(/short name/i), "Club Roles-");
    await user.click(screen.getByRole("button", { name: /shorten link/i }));
    expect(api.createShortUrl).toHaveBeenCalledWith({
      originalUrl: "https://zoom.us/j/1",
      customShortId: "club-roles",
    });
  });

  it("keeps the link and sends logged-out visitors to log in", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(null);
    const { user } = renderPage(<Landing />);
    await user.type(await screen.findByLabelText(/paste your long link/i), "https://example.com/x");
    await user.type(screen.getByLabelText(/short name/i), "club-roles");
    await user.click(screen.getByRole("button", { name: /log in and shorten/i }));

    expect(api.startLogin).toHaveBeenCalledWith("/");
    expect(api.createShortUrl).not.toHaveBeenCalled();
    expect(api.takePendingLink()).toEqual({
      originalUrl: "https://example.com/x",
      customShortId: "club-roles",
    });
  });

  it("creates the pending link once after login and shows it", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(officer);
    vi.mocked(api.createShortUrl).mockResolvedValue(created);
    api.savePendingLink({ originalUrl: created.originalUrl, customShortId: "club-roles" });

    renderPage(<Landing />);
    expect(await screen.findByText(/your short link is ready/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /\/club-roles$/ })).toBeInTheDocument();
    expect(api.createShortUrl).toHaveBeenCalledTimes(1);
  });

  it("shows the API's message and keeps the input when creating fails", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(officer);
    vi.mocked(api.createShortUrl).mockRejectedValue(new Error("boom"));
    const { user } = renderPage(<Landing />);
    const input = await screen.findByLabelText(/paste your long link/i);
    await user.type(input, "https://example.com");
    await user.click(screen.getByRole("button", { name: /shorten link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    expect(input).toHaveValue("https://example.com");
  });

  it("goes where the visitor was heading after login", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(officer);
    sessionStorage.setItem("postLoginReturnTo", "/dashboard");
    renderPage(<Landing />);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/dashboard"));
  });

  it("fills the short name from an example", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(officer);
    const { user } = renderPage(<Landing />);
    await user.click(await screen.findByRole("button", { name: /\/visit-us$/ }));
    expect(screen.getByLabelText(/short name/i)).toHaveValue("visit-us");
  });
});
