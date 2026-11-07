import axios from "axios";
import { Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  apiErrorMessage,
  createShortUrl,
  type ShortUrl,
  shortLink,
  shortLinkLabel,
} from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Dashboard() {
  const { user } = useAuth();
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [originalUrl, setOriginalUrl] = useState("");
  const [customShortId, setCustomShortId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    axios
      .get<ShortUrl[]>("/api/urls")
      .then((res) => setUrls(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [user]);

  if (user === null) return <Navigate to="/login?next=/dashboard" replace />;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!originalUrl.trim()) return;
    try {
      const created = await createShortUrl({ originalUrl, customShortId });
      setUrls((prev) => [created, ...prev]);
      setOriginalUrl("");
      setCustomShortId("");
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleDelete = async (shortId: string) => {
    try {
      await axios.delete(`/api/urls/${shortId}`);
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
          placeholder="Paste a long URL..."
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          type="url"
          aria-label="Paste a long URL"
        />
        <Input
          className="text-base sm:w-44"
          placeholder="Custom name (optional)"
          value={customShortId}
          onChange={(e) => setCustomShortId(e.target.value)}
          type="text"
          aria-label="Custom name"
          maxLength={32}
        />
        <Button type="submit">Shorten</Button>
      </form>
      {user && urls.length === 0 && !error && (
        <p className="text-muted-foreground">No links yet. Paste one above to get started.</p>
      )}
      <div className="space-y-4">
        {urls.map((url) => (
          <Card key={url.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <a
                href={shortLink(url.shortId)}
                target="_blank"
                rel="noreferrer"
                className="text-primary mb-1 block truncate font-mono text-base hover:underline"
              >
                {shortLinkLabel(url.shortId)}
              </a>
              <div className="text-muted-foreground truncate text-sm">{url.originalUrl}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-right">
              <Link
                to={`/stats/${url.shortId}`}
                className="text-lg font-bold text-gray-900 hover:underline"
              >
                {url.clicks} clicks
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
