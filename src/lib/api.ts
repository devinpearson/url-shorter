import axios from "axios";

// Empty by default: the API is served from the same origin (Vite proxies /api in dev).
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface ShortUrl {
  id: string;
  shortId: string;
  originalUrl: string;
  clicks: number;
  createdAt?: string;
}

export interface NewShortUrl {
  originalUrl: string;
  customShortId?: string;
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
  const res = await axios.post<ShortUrl>("/api/urls", payload);
  return res.data;
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
    if (status === 409) return "That custom name is already taken. Please choose another.";
    if (status === 401) return "Please log in to continue.";
    if (status === 429) return serverMessage ?? "Too many links at once. Please wait a minute.";
    if (status === 400 && serverMessage) return serverMessage;
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
