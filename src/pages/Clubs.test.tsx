import { screen, waitFor } from "@testing-library/react";
import axios, { AxiosError, type AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { renderPage } from "../test/render";
import Club from "./Club";
import ClubPage from "./ClubPage";
import Clubs from "./Clubs";
import Join from "./Join";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  fetchCurrentUser: vi.fn(),
  fetchClubs: vi.fn(),
  createClub: vi.fn(),
  fetchClub: vi.fn(),
  createInvite: vi.fn(),
  cancelInvite: vi.fn(),
  removeMember: vi.fn(),
  renameClub: vi.fn(),
  fetchInvite: vi.fn(),
  acceptInvite: vi.fn(),
  fetchClubPage: vi.fn(),
  startLogin: vi.fn(),
}));

const ada = { id: "u1", displayName: "Ada" };
const sunrise = { id: "c1", slug: "sunrise-speakers", name: "Sunrise Speakers" };

/** An axios error with this status, as the API client would throw. */
function httpError(status: number, message = "Nope") {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { message },
  } as AxiosResponse);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(api.fetchCurrentUser).mockResolvedValue(ada);
});

describe("your clubs", () => {
  it("lists your clubs", async () => {
    vi.mocked(api.fetchClubs).mockResolvedValue([{ ...sunrise, memberCount: 2, linkCount: 1 }]);
    renderPage(<Clubs />);
    expect(await screen.findByText("Sunrise Speakers")).toBeInTheDocument();
    expect(screen.getByText("2 officers · 1 link")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sunrise Speakers/ })).toHaveAttribute(
      "href",
      "/clubs/sunrise-speakers",
    );
  });

  it("makes the page address from the club name, and opens the new club", async () => {
    vi.mocked(api.fetchClubs).mockResolvedValue([]);
    vi.mocked(api.createClub).mockResolvedValue({ ...sunrise, slug: "sunrise-tm" });
    const { user } = renderPage(<Clubs />);
    await user.type(await screen.findByLabelText("Club name"), "Sunrise Speakers");
    expect(screen.getByLabelText("Club page address")).toHaveValue("sunrise-speakers");

    await user.clear(screen.getByLabelText("Club page address"));
    await user.type(screen.getByLabelText("Club page address"), "Sunrise TM");
    await user.click(screen.getByRole("button", { name: "Create club" }));
    expect(api.createClub).toHaveBeenCalledWith({ name: "Sunrise Speakers", slug: "sunrise-tm" });
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/clubs/sunrise-tm"),
    );
  });

  it("explains a taken address", async () => {
    vi.mocked(api.fetchClubs).mockResolvedValue([]);
    vi.mocked(api.createClub).mockRejectedValue(httpError(409, "That club page address is taken."));
    const { user } = renderPage(<Clubs />);
    await user.type(await screen.findByLabelText("Club name"), "Sunrise");
    await user.click(screen.getByRole("button", { name: "Create club" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("address is taken");
  });
});

describe("a club's page for its officers", () => {
  const detail = {
    ...sunrise,
    members: [
      { id: "u1", displayName: "Ada", joinedAt: "2026-07-01T10:00:00Z" },
      { id: "u2", displayName: "Grace", joinedAt: "2026-07-02T10:00:00Z" },
    ],
    invites: [],
  };
  const renderClub = () =>
    renderPage(<Club />, { route: "/clubs/sunrise-speakers", path: "/clubs/:slug" });

  beforeEach(() => {
    vi.mocked(api.fetchClub).mockResolvedValue(detail);
    vi.spyOn(axios, "get").mockResolvedValue({
      data: [
        {
          id: "l1",
          shortId: "sunrise-zoom",
          originalUrl: "https://zoom.us",
          clicks: 0,
          clubId: "c1",
          title: "Weekly meeting",
          onClubPage: true,
        },
        {
          id: "l2",
          shortId: "my-own",
          originalUrl: "https://example.com",
          clicks: 0,
          clubId: null,
        },
      ],
    });
  });

  it("shows the club page, the club's links and its officers", async () => {
    renderClub();
    expect(await screen.findByRole("heading", { name: "Sunrise Speakers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /\/c\/sunrise-speakers/ })).toHaveAttribute(
      "href",
      "/c/sunrise-speakers",
    );
    expect(
      await screen.findByRole("img", { name: /QR code for .*\/c\/sunrise-speakers/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Weekly meeting")).toBeInTheDocument();
    expect(screen.queryByText(/my-own/)).not.toBeInTheDocument();
    expect(screen.getByText("Ada (you)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Grace" })).toBeInTheDocument();
  });

  it("makes an invite link to send to the next officer", async () => {
    vi.mocked(api.createInvite).mockResolvedValue({
      id: "i1",
      token: "abc123",
      expiresAt: "2026-07-15T10:00:00Z",
    });
    const { user } = renderClub();
    await user.click(await screen.findByRole("button", { name: "Invite an officer" }));
    expect(await screen.findByLabelText("Send this link to the new officer")).toHaveValue(
      `${window.location.origin}/join/abc123`,
    );
  });

  it("asks before you leave, then goes back to your clubs", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.removeMember).mockResolvedValue();
    const { user } = renderClub();
    await user.click(await screen.findByRole("button", { name: "Leave club" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Leave Sunrise Speakers/));
    expect(api.removeMember).toHaveBeenCalledWith("sunrise-speakers", "u1");
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/clubs$/));
  });

  it("explains why the last officer can't leave", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.removeMember).mockRejectedValue(
      httpError(400, "Invite the next officer before you leave."),
    );
    const { user } = renderClub();
    await user.click(await screen.findByRole("button", { name: "Remove Grace" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invite the next officer");
  });

  it("tells outsiders to ask for an invite", async () => {
    vi.mocked(api.fetchClub).mockRejectedValue(httpError(404));
    renderClub();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Ask an officer for an invite/);
  });
});

describe("joining from an invite link", () => {
  const renderJoin = () => renderPage(<Join />, { route: "/join/tok", path: "/join/:token" });
  const invite = {
    clubName: "Sunrise Speakers",
    clubSlug: "sunrise-speakers",
    invitedBy: "Ada",
    status: "ok" as const,
  };

  it("asks you to log in first, and comes back here", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(null);
    vi.mocked(api.fetchInvite).mockResolvedValue(invite);
    const { user } = renderJoin();
    expect(
      await screen.findByRole("heading", { name: "Join Sunrise Speakers" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ada invited you/)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Log in to join" }));
    expect(api.startLogin).toHaveBeenCalledWith("/join/tok");
  });

  it("joins and opens the club", async () => {
    vi.mocked(api.fetchInvite).mockResolvedValue(invite);
    vi.mocked(api.acceptInvite).mockResolvedValue(sunrise);
    const { user } = renderJoin();
    await user.click(await screen.findByRole("button", { name: "Join as Ada" }));
    expect(api.acceptInvite).toHaveBeenCalledWith("tok");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/clubs/sunrise-speakers"),
    );
  });

  it("explains a used invite", async () => {
    vi.mocked(api.fetchInvite).mockResolvedValue({ ...invite, status: "used" });
    renderJoin();
    expect(await screen.findByRole("alert")).toHaveTextContent(/already been used/);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains a broken invite link", async () => {
    vi.mocked(api.fetchInvite).mockRejectedValue(httpError(404));
    renderJoin();
    expect(await screen.findByRole("alert")).toHaveTextContent(/copied in full/);
  });
});

describe("the public club page", () => {
  const renderClubPage = () =>
    renderPage(<ClubPage />, { route: "/c/sunrise-speakers", path: "/c/:slug" });

  it("lists the club's links by label", async () => {
    vi.mocked(api.fetchClubPage).mockResolvedValue({
      name: "Sunrise Speakers",
      slug: "sunrise-speakers",
      links: [
        { shortId: "club-roles", title: "Book a meeting role" },
        { shortId: "sunrise-zoom", title: null },
      ],
    });
    renderClubPage();
    expect(await screen.findByRole("heading", { name: "Sunrise Speakers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book a meeting role/ })).toHaveAttribute(
      "href",
      `${window.location.origin}/club-roles`,
    );
    expect(screen.getByRole("link", { name: /\/sunrise-zoom/ })).toBeInTheDocument();
    expect(document.title).toBe("Sunrise Speakers – Club Links");
  });

  it("says so when there's nothing listed or no such club", async () => {
    vi.mocked(api.fetchClubPage).mockResolvedValueOnce({ ...sunrise, links: [] });
    renderClubPage();
    expect(await screen.findByText(/hasn't added any links/)).toBeInTheDocument();
  });

  it("says when there's no such club", async () => {
    vi.mocked(api.fetchClubPage).mockRejectedValue(httpError(404));
    renderClubPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't find that club/);
  });
});
