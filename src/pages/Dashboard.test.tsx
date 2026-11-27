import { screen } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { renderPage } from "../test/render";
import Dashboard from "./Dashboard";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  fetchCurrentUser: vi.fn(),
  fetchClubs: vi.fn(),
  createShortUrl: vi.fn(),
  deleteLink: vi.fn(),
}));

const club = {
  id: "c1",
  slug: "sunrise-speakers",
  name: "Sunrise Speakers",
  memberCount: 2,
  linkCount: 1,
};
const links = [
  {
    id: "1",
    shortId: "sunrise-zoom",
    originalUrl: "https://zoom.us/j/1",
    clicks: 4,
    title: "Weekly meeting",
    clubId: "c1",
  },
  { id: "2", shortId: "club-roles", originalUrl: "https://docs.google.com/sheet", clicks: 0 },
  { id: "3", shortId: "visit-us", originalUrl: "https://forms.gle/guest", clicks: 1 },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(api.fetchCurrentUser).mockResolvedValue({ id: "u1", displayName: "Ada" });
  vi.mocked(api.fetchClubs).mockResolvedValue([club]);
  vi.spyOn(axios, "get").mockResolvedValue({ data: links });
});

describe("dashboard", () => {
  it("searches by name, destination, label or club", async () => {
    const { user } = renderPage(<Dashboard />);
    await screen.findByText(/\/sunrise-zoom$/);
    const search = screen.getByLabelText("Search your links");
    await user.type(search, "google");
    expect(screen.getByText(/\/club-roles$/)).toBeInTheDocument();
    expect(screen.queryByText(/\/sunrise-zoom$/)).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "sunrise speakers");
    expect(screen.getByText(/\/sunrise-zoom$/)).toBeInTheDocument();
    expect(screen.queryByText(/\/club-roles$/)).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "nothing-like-this");
    expect(screen.getByText(/No links match/)).toBeInTheDocument();
  });

  it("shows each link's label and club", async () => {
    renderPage(<Dashboard />);
    expect(await screen.findByText("Weekly meeting")).toBeInTheDocument();
    expect(screen.getByText("Sunrise Speakers", { selector: "div" })).toBeInTheDocument();
  });

  it("makes a link for a club, chosen from the club's page", async () => {
    vi.mocked(api.createShortUrl).mockResolvedValue({
      id: "4",
      shortId: "brave-otter-47",
      originalUrl: "https://zoom.us/j/9",
      clicks: 0,
      clubId: "c1",
    });
    const { user } = renderPage(<Dashboard />, { route: "/dashboard?club=sunrise-speakers" });
    expect(await screen.findByLabelText("For")).toHaveValue("c1");
    await user.type(screen.getByLabelText("Paste your long link"), "https://zoom.us/j/9");
    await user.click(screen.getByRole("button", { name: "Shorten" }));
    expect(api.createShortUrl).toHaveBeenCalledWith(expect.objectContaining({ clubId: "c1" }));

    await user.selectOptions(screen.getByLabelText("For"), "Just me");
    await user.type(screen.getByLabelText("Paste your long link"), "https://zoom.us/j/10");
    await user.click(screen.getByRole("button", { name: "Shorten" }));
    expect(api.createShortUrl).toHaveBeenLastCalledWith(expect.objectContaining({ clubId: "" }));
  });

  it("hides the club choice for officers without a club", async () => {
    vi.mocked(api.fetchClubs).mockResolvedValue([]);
    renderPage(<Dashboard />);
    await screen.findByText(/\/sunrise-zoom$/);
    expect(screen.queryByLabelText("For")).not.toBeInTheDocument();
  });

  it("links each row to its QR code, editing and stats", async () => {
    renderPage(<Dashboard />);
    expect(
      await screen.findByRole("link", { name: /Manage sunrise-zoom: QR code, edit and stats/ }),
    ).toHaveAttribute("href", "/stats/sunrise-zoom");
  });

  it("asks before deleting", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.mocked(api.deleteLink).mockResolvedValue();
    const { user } = renderPage(<Dashboard />);
    await user.click(await screen.findByRole("button", { name: "Delete visit-us" }));
    expect(api.deleteLink).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Delete visit-us" }));
    expect(api.deleteLink).toHaveBeenCalledWith("visit-us");
    expect(screen.queryByText(/\/visit-us$/)).not.toBeInTheDocument();
  });
});
