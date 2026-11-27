import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { renderPage } from "../test/render";
import Stats from "./Stats";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  fetchCurrentUser: vi.fn(),
  fetchLink: vi.fn(),
  fetchClubs: vi.fn(),
  updateDestination: vi.fn(),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
}));

const officer = { id: "u1", displayName: "Ada" };
const days = Array.from({ length: 30 }, (_, i) => ({
  day: new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10),
  clicks: i === 29 ? 3 : 0,
}));
const link = (originalUrl = "https://zoom.us/j/111", history: api.LinkStats["history"] = []) => ({
  id: "l1",
  shortId: "sunrise-zoom",
  originalUrl,
  clicks: 5,
  lastClickedAt: "2026-11-07T10:00:00Z",
  stats: { daily: days, sources: { link: 2, qr: 3 }, history },
});

const renderStats = () =>
  renderPage(<Stats />, { route: "/stats/sunrise-zoom", path: "/stats/:shortId" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.fetchCurrentUser).mockResolvedValue(officer);
  vi.mocked(api.fetchClubs).mockResolvedValue([]);
});

describe("link page", () => {
  it("shows the link, its QR code and where clicks came from", async () => {
    vi.mocked(api.fetchLink).mockResolvedValue(link());
    renderStats();
    expect(
      await screen.findByRole("img", { name: /QR code for .*\/sunrise-zoom/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download for poster/i })).toBeEnabled();
    expect(screen.getByText("from the QR code").previousElementSibling).toHaveTextContent("3");
    expect(screen.getByText("typed or clicked").previousElementSibling).toHaveTextContent("2");
    expect(screen.getByText("3 clicks in the last 30 days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /preview page/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/\/sunrise-zoom\+$/),
    );
  });

  it("changes where the link goes and lists the old address", async () => {
    vi.mocked(api.fetchLink)
      .mockResolvedValueOnce(link())
      .mockResolvedValueOnce(
        link("https://zoom.us/j/222", [
          { originalUrl: "https://zoom.us/j/111", replacedAt: "2026-11-07T11:00:00Z" },
        ]),
      );
    vi.mocked(api.updateDestination).mockResolvedValue(link("https://zoom.us/j/222"));
    const { user } = renderStats();

    const input = await screen.findByLabelText("New destination");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.clear(input);
    await user.type(input, "https://zoom.us/j/222");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(api.updateDestination).toHaveBeenCalledWith("sunrise-zoom", "https://zoom.us/j/222");
    expect(await screen.findByRole("status")).toHaveTextContent(/now go here/);
    expect(screen.getByText("Earlier addresses")).toBeInTheDocument();
    expect(screen.getByText("https://zoom.us/j/111")).toBeInTheDocument();
  });

  it("asks before deleting, and does nothing if you cancel", async () => {
    vi.mocked(api.fetchLink).mockResolvedValue(link());
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { user } = renderStats();
    await user.click(await screen.findByRole("button", { name: /delete this link/i }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/stop working/));
    expect(api.deleteLink).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: /delete this link/i }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/dashboard"));
    expect(api.deleteLink).toHaveBeenCalledWith("sunrise-zoom");
  });

  it("hands the link to a club and lists it on the club page", async () => {
    vi.mocked(api.fetchLink).mockResolvedValue(link());
    vi.mocked(api.fetchClubs).mockResolvedValue([
      {
        id: "c1",
        slug: "sunrise-speakers",
        name: "Sunrise Speakers",
        memberCount: 2,
        linkCount: 0,
      },
    ]);
    vi.mocked(api.updateLink).mockResolvedValue({
      ...link(),
      title: "Weekly meeting",
      clubId: "c1",
      onClubPage: true,
    });
    const { user } = renderStats();

    await user.type(await screen.findByLabelText("Label (optional)"), "Weekly meeting");
    expect(screen.queryByLabelText(/Show on the club page/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Who looks after it"), "c1");
    await user.click(screen.getByLabelText(/Show on the club page/));
    await user.click(screen.getByRole("button", { name: "Save details" }));

    expect(api.updateLink).toHaveBeenCalledWith("sunrise-zoom", {
      title: "Weekly meeting",
      clubId: "c1",
      onClubPage: true,
    });
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save details" })).toBeDisabled();
  });

  it("suggests setting up a club when you have none", async () => {
    vi.mocked(api.fetchLink).mockResolvedValue(link());
    renderStats();
    expect(await screen.findByRole("link", { name: "Set up your club" })).toHaveAttribute(
      "href",
      "/clubs",
    );
  });
});
