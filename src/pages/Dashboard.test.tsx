import { screen } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { renderPage } from "../test/render";
import Dashboard from "./Dashboard";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  fetchCurrentUser: vi.fn(),
  deleteLink: vi.fn(),
}));

const links = [
  { id: "1", shortId: "sunrise-zoom", originalUrl: "https://zoom.us/j/1", clicks: 4 },
  { id: "2", shortId: "club-roles", originalUrl: "https://docs.google.com/sheet", clicks: 0 },
  { id: "3", shortId: "visit-us", originalUrl: "https://forms.gle/guest", clicks: 1 },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(api.fetchCurrentUser).mockResolvedValue({ id: "u1", displayName: "Ada" });
  vi.spyOn(axios, "get").mockResolvedValue({ data: links });
});

describe("dashboard", () => {
  it("searches by name or destination", async () => {
    const { user } = renderPage(<Dashboard />);
    await screen.findByText(/\/sunrise-zoom$/);
    await user.type(screen.getByLabelText("Search your links"), "google");
    expect(screen.getByText(/\/club-roles$/)).toBeInTheDocument();
    expect(screen.queryByText(/\/sunrise-zoom$/)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search your links"));
    await user.type(screen.getByLabelText("Search your links"), "nothing-like-this");
    expect(screen.getByText(/No links match/)).toBeInTheDocument();
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
