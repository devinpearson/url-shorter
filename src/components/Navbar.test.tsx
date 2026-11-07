import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { renderPage } from "../test/render";
import Navbar from "./Navbar";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  fetchCurrentUser: vi.fn(),
  startLogin: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe("Navbar", () => {
  it("links to the dashboard, about and contact pages", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(null);
    renderPage(<Navbar />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const name of ["Dashboard", "About", "Contact"]) {
      expect(within(nav).getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("offers Log in when logged out", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(null);
    const { user } = renderPage(<Navbar />);
    await user.click(await screen.findByRole("button", { name: "Log in" }));
    expect(api.startLogin).toHaveBeenCalled();
  });

  it("offers Log out when logged in", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue({ id: "u1", displayName: "Ada" });
    renderPage(<Navbar />);
    expect(await screen.findByRole("link", { name: "Log out" })).toHaveAttribute(
      "href",
      "/api/auth/logout",
    );
  });

  it("closes the mobile menu after navigating", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(null);
    const { user } = renderPage(<Navbar />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = document.getElementById("mobile-menu");
    expect(menu).not.toBeNull();
    await user.click(within(menu as HTMLElement).getByRole("link", { name: "About" }));
    expect(document.getElementById("mobile-menu")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/about");
  });
});
