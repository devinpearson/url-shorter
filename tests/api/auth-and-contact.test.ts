import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setupApi } from "./helpers";

const { api, loggedIn } = setupApi();

describe("auth API", () => {
  it("answers /me with null when logged out, so browsers don't log an error", async () => {
    const res = await api().get("/api/auth/me").expect(200);
    expect(res.body).toBeNull();
  });

  it("returns only the user's id, name and email when logged in", async () => {
    const agent = await loggedIn({ displayName: "Ada", email: "ada@example.com" });
    const res = await agent.get("/api/auth/me").expect(200);
    expect(Object.keys(res.body).sort()).toEqual(["_id", "displayName", "email"]);
    expect(res.body.displayName).toBe("Ada");
  });

  it("logs out and redirects to the frontend", async () => {
    const agent = await loggedIn();
    const res = await agent.get("/api/auth/logout").expect(302);
    expect(res.headers.location).toBe("http://localhost:5173/");
    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body).toBeNull();
  });

  it("sets security headers", async () => {
    const res = await api().get("/api/ping").expect(200);
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
  });
});

describe("contact API", () => {
  const messages = () => mongoose.connection.collection("contactmessages");
  const valid = { name: "Ada", email: "ada@example.com", topic: "question", message: "Hello" };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("saves a valid message", async () => {
    await api().post("/api/contact").send(valid).expect(201);
    const [saved] = await messages().find().toArray();
    expect(saved).toMatchObject({ name: "Ada", topic: "question", emailed: false });
  });

  it("keeps the reported link only for link reports", async () => {
    await api()
      .post("/api/contact")
      .send({ ...valid, topic: "report", link: "toast.li/bad" })
      .expect(201);
    await api()
      .post("/api/contact")
      .send({ ...valid, link: "toast.li/ignored" })
      .expect(201);
    const saved = await messages().find().sort({ createdAt: 1 }).toArray();
    expect(saved.map((m) => m.link)).toEqual(["toast.li/bad", undefined]);
  });

  it.each([
    [{ ...valid, name: "" }, /name, email and message/],
    [{ ...valid, email: "nope" }, /valid email/],
    [{ ...valid, topic: "spam" }, /what your message is about/],
  ])("rejects %j", async (body, message) => {
    const res = await api().post("/api/contact").send(body).expect(400);
    expect(res.body.message).toMatch(message);
    expect(await messages().countDocuments()).toBe(0);
  });

  it("allows 5 messages an hour from one address", async () => {
    for (let i = 0; i < 5; i++) await api().post("/api/contact").send(valid).expect(201);
    const res = await api().post("/api/contact").send(valid).expect(429);
    expect(res.body.message).toMatch(/Too many messages/);
  });

  it("pretends to accept honeypot submissions but saves nothing", async () => {
    await api()
      .post("/api/contact")
      .send({ ...valid, website: "http://spam.example" })
      .expect(202);
    expect(await messages().countDocuments()).toBe(0);
  });

  it("emails through Resend when configured, escaping HTML", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_RECIPIENT_EMAIL", "owner@toast.li");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await api()
      .post("/api/contact")
      .send({ ...valid, message: "<script>x</script>" })
      .expect(201);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ to: "owner@toast.li", reply_to: "ada@example.com" });
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.html).not.toContain("<script>");
    const [saved] = await messages().find().toArray();
    expect(saved.emailed).toBe(true);
  });

  it("still saves the message when the email fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await api().post("/api/contact").send(valid).expect(201);
    const [saved] = await messages().find().toArray();
    expect(saved.emailed).toBe(false);
  });
});
