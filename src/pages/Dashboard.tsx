import axios from "axios";
import { QrCode as QrCodeIcon, Search, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Button, buttonVariants } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  apiErrorMessage,
  type ClubSummary,
  createShortUrl,
  deleteLink,
  fetchClubs,
  type ShortUrl,
  shortLink,
  shortLinkLabel,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { normalizeShortName, shortNameProblem, tidyShortNameInput } from "../lib/shortNames";

export default function Dashboard() {
  const { user } = useAuth();
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [originalUrl, setOriginalUrl] = useState("");
  const [customShortId, setCustomShortId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  // /dashboard?club=<slug> starts with that club chosen (from the club's page).
  const [params] = useSearchParams();
  const [clubChoice, setClubChoice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    axios
      .get<ShortUrl[]>("/api/urls")
      .then((res) => setUrls(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(apiErrorMessage(err)));
    fetchClubs()
      .then(setClubs)
      .catch(() => setClubs([]));
  }, [user]);

  if (user === null) return <Navigate to="/login?next=/dashboard" replace />;

  const clubFor = (url: ShortUrl) => clubs.find((c) => c.id === url.clubId);
  const clubId = clubChoice ?? clubs.find((c) => c.slug === params.get("club"))?.id ?? "";

  const query = search.trim().toLowerCase();
  const visible = query
    ? urls.filter((u) =>
        [u.shortId, u.originalUrl, u.title ?? "", clubFor(u)?.name ?? ""].some((field) =>
          field.toLowerCase().includes(query),
        ),
      )
    : urls;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!originalUrl.trim()) return;
    const name = normalizeShortName(customShortId);
    const problem = shortNameProblem(name);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      const created = await createShortUrl({ originalUrl, customShortId: name, clubId });
      setUrls((prev) => [created, ...prev]);
      setOriginalUrl("");
      setCustomShortId("");
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleDelete = async (shortId: string) => {
    const sure = window.confirm(
      `Delete ${shortLinkLabel(shortId)}? Posters and QR codes using it will stop working.`,
    );
    if (!sure) return;
    try {
      await deleteLink(shortId);
      setUrls((prev) => prev.filter((url) => url.shortId !== shortId));
    } catch {
      setError("Failed to delete URL. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h2 className="mb-4 font-sans text-2xl font-bold text-gray-900">Your short links</h2>
      {error && (
        <div
          role="alert"
          className="text-destructive bg-destructive/10 border-destructive mb-4 rounded border px-4 py-2"
        >
          {error}
        </div>
      )}
      <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <Input
          className="flex-1 text-base"
          placeholder="Paste your long link (e.g. Zoom)"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          type="url"
          aria-label="Paste your long link"
        />
        <Input
          className="text-base sm:w-44"
          placeholder="Short name (optional)"
          value={customShortId}
          onChange={(e) => setCustomShortId(tidyShortNameInput(e.target.value))}
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Short name (optional)"
          maxLength={32}
        />
        <Button type="submit">Shorten</Button>
      </form>
      {clubs.length > 0 && (
        <div className="-mt-4 mb-6 flex items-center gap-2 text-sm">
          <label htmlFor="new-link-club" className="text-gray-700">
            For
          </label>
          <select
            id="new-link-club"
            value={clubId}
            onChange={(e) => setClubChoice(e.target.value)}
            className="border-input h-9 rounded-md border bg-white px-2"
          >
            <option value="">Just me</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {user && urls.length === 0 && !error && (
        <p className="text-muted-foreground">No links yet. Paste one above to get started.</p>
      )}
      {urls.length > 0 && (
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute top-2.5 left-3 size-5 text-gray-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your links"
            aria-label="Search your links"
            className="pl-10 text-base"
          />
        </div>
      )}
      {urls.length > 0 && visible.length === 0 && (
        <p className="text-muted-foreground">No links match &ldquo;{search}&rdquo;.</p>
      )}
      <div className="space-y-4">
        {visible.map((url) => (
          <Card key={url.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <a
                href={shortLink(url.shortId)}
                target="_blank"
                rel="noreferrer"
                className="text-primary mb-1 block truncate text-lg font-semibold hover:underline"
              >
                {shortLinkLabel(url.shortId)}
              </a>
              {url.title && (
                <div className="truncate text-sm font-medium text-gray-700">{url.title}</div>
              )}
              <div className="text-muted-foreground truncate text-sm">{url.originalUrl}</div>
              {clubFor(url) && (
                <div className="mt-1 text-xs text-gray-600">{clubFor(url)?.name}</div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-right">
              <Link
                to={`/stats/${url.shortId}`}
                className="text-lg font-bold text-gray-900 hover:underline"
              >
                {url.clicks} clicks
              </Link>
              <Link
                to={`/stats/${url.shortId}`}
                className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
                aria-label={`Manage ${url.shortId}: QR code, edit and stats`}
              >
                <QrCodeIcon className="size-4" aria-hidden="true" />
                Manage
              </Link>
              <Button
                variant="destructive"
                size="icon"
                aria-label={`Delete ${url.shortId}`}
                onClick={() => handleDelete(url.shortId)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
