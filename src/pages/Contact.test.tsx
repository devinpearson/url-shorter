import { screen } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { renderPage } from "../test/render";
import Contact from "./Contact";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  fetchCurrentUser: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(api.fetchCurrentUser).mockResolvedValue(null);
});

describe("Contact", () => {
  it("requires a name, email and message", async () => {
    const post = vi.spyOn(axios, "post");
    const { user } = renderPage(<Contact />);
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/name, email and message/i);
    expect(post).not.toHaveBeenCalled();
  });

  it("opens on Report a link from the footer link", async () => {
    renderPage(<Contact />, { route: "/contact?topic=report" });
    expect(screen.getByRole("radio", { name: /report a link/i })).toBeChecked();
    expect(screen.getByLabelText(/short link you're reporting/i)).toBeInTheDocument();
  });

  it("prefills the logged-in officer's details", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue({
      _id: "u1",
      displayName: "Ada",
      email: "ada@example.com",
    });
    renderPage(<Contact />);
    expect(await screen.findByDisplayValue("Ada")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveValue("ada@example.com");
  });

  it("sends the message and confirms", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: {} });
    const { user } = renderPage(<Contact />);
    await user.type(screen.getByLabelText(/name/i), "Ada");
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.click(screen.getByRole("radio", { name: /report a link/i }));
    await user.type(screen.getByLabelText(/short link you're reporting/i), "toast.li/bad");
    await user.type(screen.getByLabelText(/message/i), "This looks like phishing");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/ada@example.com/);
    expect(post).toHaveBeenCalledWith("/api/contact", {
      name: "Ada",
      email: "ada@example.com",
      topic: "report",
      link: "toast.li/bad",
      message: "This looks like phishing",
      website: "",
    });
  });

  it("shows the server's error message", async () => {
    vi.spyOn(axios, "post").mockRejectedValue(
      Object.assign(new axios.AxiosError("429"), {
        response: { status: 429, data: { message: "Too many messages." } },
      }),
    );
    const { user } = renderPage(<Contact />);
    await user.type(screen.getByLabelText(/name/i), "Ada");
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/message/i), "Hi");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many messages.");
  });
});
