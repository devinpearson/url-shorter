import axios from "axios";

// Empty by default: the API is served from the same origin (Vite proxies /api in dev).
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface ShortUrl {
  id: string;
  shortId: string;
  originalUrl: string;
  clicks: number;
  createdAt?: string;
  lastClickedAt?: string | null;
  /** A friendly label, e.g. "Weekly meeting (Zoom)". */
  title?: string | null;
  /** The club that looks after it, or null for a personal link. */
  clubId?: string | null;
  onClubPage?: boolean;
}

export interface NewShortUrl {
  originalUrl: string;
  customShortId?: string;
  /** Make it for one of the user's clubs. */
  clubId?: string | null;
}

export interface CurrentUser {
  id: string;
  displayName: string;
  email?: string | null;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await axios.get<CurrentUser | null>("/api/auth/me");
    return res.data || null;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) return null;
    throw err;
  }
}

export async function createShortUrl(input: NewShortUrl): Promise<ShortUrl> {
  const payload: NewShortUrl = { originalUrl: input.originalUrl.trim() };
  const custom = input.customShortId?.trim();
  if (custom) payload.customShortId = custom;
  if (input.clubId) payload.clubId = input.clubId;
  const res = await axios.post<ShortUrl>("/api/urls", payload);
  return res.data;
}

export interface LinkStats {
  daily: { day: string; clicks: number }[];
  sources: { link: number; qr: number };
  history: { originalUrl: string; replacedAt: string }[];
}

export type ShortUrlWithStats = ShortUrl & { stats: LinkStats };

export async function fetchLink(shortId: string): Promise<ShortUrlWithStats> {
  const res = await axios.get<ShortUrlWithStats>(`/api/urls/${encodeURIComponent(shortId)}`);
  return res.data;
}

export interface LinkChanges {
  title?: string | null;
  clubId?: string | null;
  onClubPage?: boolean;
}

/** Changes a link's label, the club that looks after it, or whether it's on the club page. */
export async function updateLink(shortId: string, changes: LinkChanges): Promise<ShortUrl> {
  const res = await axios.patch<ShortUrl>(`/api/urls/${encodeURIComponent(shortId)}`, changes);
  return res.data;
}

/** Points a link somewhere new; its name, posters and QR codes keep working. */
export async function updateDestination(shortId: string, originalUrl: string): Promise<ShortUrl> {
  const res = await axios.patch<ShortUrl>(`/api/urls/${encodeURIComponent(shortId)}`, {
    originalUrl: originalUrl.trim(),
  });
  return res.data;
}

/* ---------- Clubs ---------- */

export interface Club {
  id: string;
  slug: string;
  name: string;
}

export interface ClubSummary extends Club {
  memberCount: number;
  linkCount: number;
}

export interface ClubDetail extends Club {
  members: { id: string; displayName: string; joinedAt: string }[];
  invites: { id: string; createdAt: string; expiresAt: string; createdBy: string | null }[];
}

export interface ClubPageData {
  name: string;
  slug: string;
  links: { shortId: string; title: string | null }[];
}

export interface InviteInfo {
  clubName: string;
  clubSlug: string;
  invitedBy: string | null;
  status: "ok" | "used" | "expired";
}

const club = (slug: string) => `/api/clubs/${encodeURIComponent(slug)}`;

export async function fetchClubs(): Promise<ClubSummary[]> {
  const res = await axios.get<ClubSummary[]>("/api/clubs");
  return Array.isArray(res.data) ? res.data : [];
}

export async function createClub(input: { name: string; slug?: string }): Promise<Club> {
  const res = await axios.post<Club>("/api/clubs", input);
  return res.data;
}

export async function fetchClub(slug: string): Promise<ClubDetail> {
  const res = await axios.get<ClubDetail>(club(slug));
  return res.data;
}

export async function renameClub(slug: string, name: string): Promise<Club> {
  const res = await axios.patch<Club>(club(slug), { name });
  return res.data;
}

/** A single-use invite link token for another officer. It can only be shown once. */
export async function createInvite(
  slug: string,
): Promise<{ id: string; token: string; expiresAt: string }> {
  const res = await axios.post(`${club(slug)}/invites`);
  return res.data;
}

export async function cancelInvite(slug: string, inviteId: string): Promise<void> {
  await axios.delete(`${club(slug)}/invites/${encodeURIComponent(inviteId)}`);
}

/** Takes an officer off the club; pass your own id to leave. */
export async function removeMember(slug: string, userId: string): Promise<void> {
  await axios.delete(`${club(slug)}/members/${encodeURIComponent(userId)}`);
}

export async function fetchClubPage(slug: string): Promise<ClubPageData> {
  const res = await axios.get<ClubPageData>(`${club(slug)}/page`);
  return res.data;
}

export async function fetchInvite(token: string): Promise<InviteInfo> {
  const res = await axios.get<InviteInfo>(`/api/invites/${encodeURIComponent(token)}`);
  return res.data;
}

export async function acceptInvite(token: string): Promise<Club> {
  const res = await axios.post<Club>(`/api/invites/${encodeURIComponent(token)}/accept`);
  return res.data;
}

export const inviteLink = (token: string) => `${window.location.origin}/join/${token}`;
export const clubPagePath = (slug: string) => `c/${slug}`;

export async function deleteLink(shortId: string): Promise<void> {
  await axios.delete(`/api/urls/${encodeURIComponent(shortId)}`);
}

export function shortLink(shortId: string): string {
  return `${window.location.origin}/${shortId}`;
}

/** Display form without the protocol, e.g. `example.com/club-roles`. */
export function shortLinkLabel(shortId: string): string {
  return `${window.location.host}/${shortId}`;
}

/** Turns an API error into a message a club officer can act on. */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const serverMessage = (err.response?.data as { message?: string } | undefined)?.message;
    if (status === 409)
      return serverMessage ?? "That name is already taken. Please choose another.";
    if (status === 401) return "Please log in to continue.";
    if (status === 429) return serverMessage ?? "Too many links at once. Please wait a minute.";
    if ((status === 400 || status === 403 || status === 410) && serverMessage) return serverMessage;
  }
  return "Something went wrong. Please try again.";
}

/* ---------- Carrying state across the Auth0 redirect ---------- */

const PENDING_LINK_KEY = "pendingShortUrl";
const RETURN_TO_KEY = "postLoginReturnTo";

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Sends the browser to Auth0. The backend always returns to `/`, which then routes on. */
export function startLogin(returnTo = "/dashboard") {
  try {
    storage()?.setItem(RETURN_TO_KEY, returnTo);
  } catch {
    /* storage blocked: the user lands on the home page instead */
  }
  window.location.href = `${API_BASE}/api/auth/login`;
}

export function takeReturnTo(): string | null {
  try {
    const value = storage()?.getItem(RETURN_TO_KEY) ?? null;
    storage()?.removeItem(RETURN_TO_KEY);
    // Only allow in-app paths, never another site.
    return value?.startsWith("/") && !value.startsWith("//") ? value : null;
  } catch {
    return null;
  }
}

export function savePendingLink(link: NewShortUrl) {
  try {
    storage()?.setItem(PENDING_LINK_KEY, JSON.stringify(link));
  } catch {
    /* storage blocked: the user will need to paste the link again */
  }
}

export function takePendingLink(): NewShortUrl | null {
  try {
    const raw = storage()?.getItem(PENDING_LINK_KEY);
    storage()?.removeItem(PENDING_LINK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NewShortUrl>;
    return typeof parsed.originalUrl === "string"
      ? { originalUrl: parsed.originalUrl, customShortId: parsed.customShortId }
      : null;
  } catch {
    return null;
  }
}
