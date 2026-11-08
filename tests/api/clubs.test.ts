import { describe, expect, it } from "vitest";
import { setupApi } from "./helpers";

const { api, db, loggedIn } = setupApi();

const officer = (name: string) => loggedIn({ id: `test|${name}`, displayName: name });

async function clubWithOfficer(name = "Sunrise Speakers") {
  const president = await officer("Ada");
  const res = await president.post("/api/clubs").send({ name }).expect(201);
  return { president, club: res.body as { id: string; slug: string; name: string } };
}

/** Invites someone into the club and accepts it as them. */
async function join(inviter: Awaited<ReturnType<typeof officer>>, slug: string, name: string) {
  const { token } = (await inviter.post(`/api/clubs/${slug}/invites`).expect(201)).body;
  const agent = await officer(name);
  await agent.post(`/api/invites/${token}/accept`).expect(200);
  return agent;
}

describe("clubs", () => {
  it("makes a club page address from the name, and keeps addresses unique", async () => {
    const { president, club } = await clubWithOfficer("Sunrise Speakers");
    expect(club).toMatchObject({ slug: "sunrise-speakers", name: "Sunrise Speakers" });

    const other = await officer("Grace");
    const taken = await other.post("/api/clubs").send({ name: "Sunrise  Speakers" }).expect(409);
    expect(taken.body.message).toMatch(/ask its officers for an invite/);
    await other.post("/api/clubs").send({ name: "Sunrise", slug: "Sunrise Mornings" }).expect(201);

    const list = await president.get("/api/clubs").expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({ slug: "sunrise-speakers", memberCount: 1 }),
    ]);
  });

  it("refuses a club without a name or with an unusable address", async () => {
    const agent = await officer("Ada");
    await agent.post("/api/clubs").send({ name: "  " }).expect(400);
    await agent.post("/api/clubs").send({ name: "Club", slug: "a!" }).expect(400);
    await api().post("/api/clubs").send({ name: "Club" }).expect(401);
  });

  it("only shows a club to its officers", async () => {
    const { club } = await clubWithOfficer();
    const outsider = await officer("Mallory");
    await outsider.get(`/api/clubs/${club.slug}`).expect(404);
    await outsider.post(`/api/clubs/${club.slug}/invites`).expect(404);
    await outsider.patch(`/api/clubs/${club.slug}`).send({ name: "Mine now" }).expect(404);
  });

  it("can be renamed by an officer", async () => {
    const { president, club } = await clubWithOfficer();
    await president.patch(`/api/clubs/${club.slug}`).send({ name: "Sunrise TM" }).expect(200);
    const detail = await president.get(`/api/clubs/${club.slug}`).expect(200);
    expect(detail.body.name).toBe("Sunrise TM");
  });
});

describe("club links", () => {
  it("are shared by every officer, but not with anyone else", async () => {
    const { president, club } = await clubWithOfficer();
    await president
      .post("/api/urls")
      .send({ originalUrl: "https://zoom.us/j/1", customShortId: "sunrise-zoom", clubId: club.id })
      .expect(201);
    const vpe = await join(president, club.slug, "Grace");

    const list = await vpe.get("/api/urls").expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({ shortId: "sunrise-zoom", clubId: club.id }),
    ]);
    await vpe
      .patch("/api/urls/sunrise-zoom")
      .send({ originalUrl: "https://zoom.us/j/2" })
      .expect(200);

    const outsider = await officer("Mallory");
    await outsider.get("/api/urls/sunrise-zoom").expect(404);
    await outsider.delete("/api/urls/sunrise-zoom").expect(404);
    expect((await outsider.get("/api/urls").expect(200)).body).toEqual([]);

    await vpe.delete("/api/urls/sunrise-zoom").expect(200);
  });

  it("can only be made for, or moved to, your own clubs", async () => {
    const { club } = await clubWithOfficer();
    const outsider = await officer("Mallory");
    await outsider
      .post("/api/urls")
      .send({ originalUrl: "https://example.com", clubId: club.id })
      .expect(403);
    await outsider
      .post("/api/urls")
      .send({ originalUrl: "https://example.com", customShortId: "mine" })
      .expect(201);
    await outsider.patch("/api/urls/mine").send({ clubId: club.id }).expect(403);
    await outsider.patch("/api/urls/mine").send({ clubId: "not-a-uuid" }).expect(400);
  });

  it("moves a personal link to the club and back", async () => {
    const { president, club } = await clubWithOfficer();
    await president
      .post("/api/urls")
      .send({ originalUrl: "https://example.com", customShortId: "club-roles" })
      .expect(201);
    const moved = await president
      .patch("/api/urls/club-roles")
      .send({ clubId: club.id, title: " Role sign-up ", onClubPage: true })
      .expect(200);
    expect(moved.body).toMatchObject({ clubId: club.id, title: "Role sign-up", onClubPage: true });

    // A personal link can't be on a club page.
    const back = await president.patch("/api/urls/club-roles").send({ clubId: null }).expect(200);
    expect(back.body).toMatchObject({ clubId: null, onClubPage: false });
  });

  it("checks labels", async () => {
    const { president } = await clubWithOfficer();
    await president
      .post("/api/urls")
      .send({ originalUrl: "https://example.com", customShortId: "club-roles" })
      .expect(201);
    await president
      .patch("/api/urls/club-roles")
      .send({ title: "x".repeat(101) })
      .expect(400);
    await president.patch("/api/urls/club-roles").send({ onClubPage: "yes" }).expect(400);
    const cleared = await president.patch("/api/urls/club-roles").send({ title: "" }).expect(200);
    expect(cleared.body.title).toBeNull();
  });
});

describe("invites and handover", () => {
  it("says which club an invite is for, before logging in", async () => {
    const { president, club } = await clubWithOfficer();
    const { token, expiresAt } = (
      await president.post(`/api/clubs/${club.slug}/invites`).expect(201)
    ).body;
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);

    const res = await api().get(`/api/invites/${token}`).expect(200);
    expect(res.body).toEqual({
      clubName: "Sunrise Speakers",
      clubSlug: "sunrise-speakers",
      invitedBy: "Ada",
      status: "ok",
    });
    await api().get("/api/invites/nonsense").expect(404);
    await api().post(`/api/invites/${token}/accept`).expect(401);
  });

  it("works once, and not after it expires or is cancelled", async () => {
    const { president, club } = await clubWithOfficer();
    const invite = async () => (await president.post(`/api/clubs/${club.slug}/invites`)).body;

    const first = await invite();
    await (await officer("Grace")).post(`/api/invites/${first.token}/accept`).expect(200);
    const late = await officer("Linus");
    const used = await late.post(`/api/invites/${first.token}/accept`).expect(410);
    expect(used.body.message).toMatch(/already been used/);

    const old = await invite();
    await db().query(
      "UPDATE club_invites SET expires_at = now() - interval '1 minute' WHERE id = $1",
      [old.id],
    );
    expect((await api().get(`/api/invites/${old.token}`)).body.status).toBe("expired");
    await late.post(`/api/invites/${old.token}/accept`).expect(410);

    const cancelled = await invite();
    const pending = (await president.get(`/api/clubs/${club.slug}`)).body.invites;
    expect(pending.map((i: { id: string }) => i.id)).toEqual([cancelled.id]);
    await president.delete(`/api/clubs/${club.slug}/invites/${cancelled.id}`).expect(200);
    await late.post(`/api/invites/${cancelled.token}/accept`).expect(404);
  });

  it("isn't used up by someone who is already an officer", async () => {
    const { president, club } = await clubWithOfficer();
    const { token } = (await president.post(`/api/clubs/${club.slug}/invites`)).body;
    await president.post(`/api/invites/${token}/accept`).expect(200);
    await (await officer("Grace")).post(`/api/invites/${token}/accept`).expect(200);
  });

  it("hands the club's links to the next officer when the old one leaves", async () => {
    const { president, club } = await clubWithOfficer();
    await president
      .post("/api/urls")
      .send({ originalUrl: "https://zoom.us/j/1", customShortId: "sunrise-zoom", clubId: club.id })
      .expect(201);

    // The only officer can't leave: the links would have nobody.
    const me = (await president.get("/api/auth/me")).body;
    const alone = await president.delete(`/api/clubs/${club.slug}/members/${me.id}`).expect(400);
    expect(alone.body.message).toMatch(/Invite the next officer/);

    const next = await join(president, club.slug, "Grace");
    const members = (await next.get(`/api/clubs/${club.slug}`)).body.members;
    expect(members.map((m: { displayName: string }) => m.displayName)).toEqual(["Ada", "Grace"]);

    await president.delete(`/api/clubs/${club.slug}/members/${me.id}`).expect(200);
    await president.get("/api/urls/sunrise-zoom").expect(404);
    await next
      .patch("/api/urls/sunrise-zoom")
      .send({ originalUrl: "https://zoom.us/j/2" })
      .expect(200);
    await next.delete(`/api/clubs/${club.slug}/members/${me.id}`).expect(404);
  });
});

describe("club pages", () => {
  it("list the club's chosen links, by label, for anyone", async () => {
    const { president, club } = await clubWithOfficer();
    const make = (customShortId: string, title: string | null, onClubPage: boolean) =>
      president
        .post("/api/urls")
        .send({ originalUrl: "https://example.com", customShortId, clubId: club.id })
        .then(() => president.patch(`/api/urls/${customShortId}`).send({ title, onClubPage }));
    await make("sunrise-zoom", "Weekly meeting (Zoom)", true);
    await make("club-roles", "Book a meeting role", true);
    await make("exco-notes", "Committee notes", false);

    const page = await api().get("/api/clubs/Sunrise-Speakers/page").expect(200);
    expect(page.body).toEqual({
      name: "Sunrise Speakers",
      slug: "sunrise-speakers",
      links: [
        { shortId: "club-roles", title: "Book a meeting role" },
        { shortId: "sunrise-zoom", title: "Weekly meeting (Zoom)" },
      ],
    });
    await api().get("/api/clubs/no-such-club/page").expect(404);
  });

  it("works for a club with nothing listed yet", async () => {
    const { club } = await clubWithOfficer();
    const page = await api().get(`/api/clubs/${club.slug}/page`).expect(200);
    expect(page.body.links).toEqual([]);
  });
});
