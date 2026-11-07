import axios from "axios";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { type ShortUrl, shortLink, shortLinkLabel } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Stats() {
  const { user } = useAuth();
  const { shortId } = useParams();
  const [url, setUrl] = useState<ShortUrl | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !shortId) return;
    axios
      .get<ShortUrl>(`/api/urls/${encodeURIComponent(shortId)}`)
      .then((res) => setUrl(res.data))
      .catch((err) =>
        setError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? "That link doesn't exist, or it belongs to another account."
            : "Couldn't load this link. Please try again.",
        ),
      );
  }, [user, shortId]);

  if (user === null) return <Navigate to={`/login?next=/stats/${shortId ?? ""}`} replace />;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link to="/dashboard" className="text-primary text-sm hover:underline">
        ← All your links
      </Link>
      <Card className="mt-4 p-6 shadow-md">
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : !url ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <>
            <a
              href={shortLink(url.shortId)}
              target="_blank"
              rel="noreferrer"
              className="text-primary mb-2 block text-2xl font-bold break-all hover:underline"
            >
              {shortLinkLabel(url.shortId)}
            </a>
            <div className="text-muted-foreground mb-4 break-all">Goes to: {url.originalUrl}</div>
            <div className="text-3xl font-bold text-gray-900">{url.clicks}</div>
            <div className="text-sm text-gray-600">total clicks</div>
          </>
        )}
      </Card>
    </div>
  );
}
