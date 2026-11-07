import axios from "axios";
import { Check, Copy, Eye, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { QrCode } from "../components/QrCode";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  apiErrorMessage,
  deleteLink,
  fetchLink,
  type LinkStats,
  type ShortUrlWithStats,
  shortLink,
  shortLinkLabel,
  updateDestination,
} from "../lib/api";
import { useAuth } from "../lib/auth";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Clicks for each of the last 30 days as bars, with the numbers available to screen readers. */
function ClickChart({ daily }: { daily: LinkStats["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.clicks));
  const total = daily.reduce((n, d) => n + d.clicks, 0);
  const label = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  return (
    <figure>
      <figcaption className="text-sm text-gray-600">
        {total} click{total === 1 ? "" : "s"} in the last 30 days
      </figcaption>
      <div className="mt-2 flex h-28 items-end gap-0.5" aria-hidden="true">
        {daily.map((d) => (
          <div
            key={d.day}
            title={`${label(d.day)}: ${d.clicks}`}
            className={
              d.clicks ? "bg-primary flex-1 rounded-t-sm" : "flex-1 rounded-t-sm bg-gray-100"
            }
            style={{ height: `${Math.max(4, (d.clicks / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-500" aria-hidden="true">
        <span>{daily[0] && label(daily[0].day)}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>Clicks per day</caption>
        <tbody>
          {daily.map((d) => (
            <tr key={d.day}>
              <th scope="row">{label(d.day)}</th>
              <td>{d.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default function Stats() {
  const { user } = useAuth();
  const { shortId } = useParams();
  const navigate = useNavigate();
  const [url, setUrl] = useState<ShortUrlWithStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !shortId) return;
    fetchLink(shortId)
      .then((data) => {
        setUrl(data);
        setDestination(data.originalUrl);
      })
      .catch((err) =>
        setLoadError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? "That link doesn't exist, or it belongs to another account."
            : "Couldn't load this link. Please try again.",
        ),
      );
  }, [user, shortId]);

  if (user === null) return <Navigate to={`/login?next=/stats/${shortId ?? ""}`} replace />;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!url || saving || destination.trim() === url.originalUrl) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await updateDestination(url.shortId, destination);
      // Reload so the history shows the address that was just replaced.
      const fresh = await fetchLink(url.shortId);
      setUrl(fresh);
      setDestination(fresh.originalUrl);
      setSaveMessage({ ok: true, text: "Saved. The short link and its QR code now go here." });
    } catch (err) {
      setSaveMessage({ ok: false, text: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(shortLink(url.shortId));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard blocked: the link is on screen to select. */
    }
  };

  const handleDelete = async () => {
    if (!url) return;
    const sure = window.confirm(
      `Delete ${shortLinkLabel(url.shortId)}? Posters and QR codes using it will stop working.`,
    );
    if (!sure) return;
    try {
      await deleteLink(url.shortId);
      navigate("/dashboard", { replace: true });
    } catch {
      setSaveMessage({ ok: false, text: "Couldn't delete the link. Please try again." });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Link to="/dashboard" className="text-primary text-sm hover:underline">
        ← All your links
      </Link>

      {loadError ? (
        <Card className="p-6">
          <p role="alert" className="text-destructive">
            {loadError}
          </p>
        </Card>
      ) : !url ? (
        <Card className="p-6">
          <p className="text-muted-foreground">Loading…</p>
        </Card>
      ) : (
        <>
          <Card className="p-6 shadow-md">
            <h1 className="sr-only">Manage {shortLinkLabel(url.shortId)}</h1>
            <a
              href={shortLink(url.shortId)}
              target="_blank"
              rel="noreferrer"
              className="text-primary block text-2xl font-bold break-all hover:underline sm:text-3xl"
            >
              {shortLinkLabel(url.shortId)}
            </a>
            <p className="mt-1 text-sm break-all text-gray-600">→ {url.originalUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <a
                href={`${shortLink(url.shortId)}+`}
                target="_blank"
                rel="noreferrer"
                className="border-input bg-background hover:bg-accent inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium"
              >
                <Eye className="size-4" aria-hidden="true" />
                Preview page
              </a>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-gray-900">QR code</h2>
            <QrCode shortId={url.shortId} />
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-gray-900">Clicks</h2>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-3xl font-bold text-gray-900">{url.clicks}</div>
                <div className="text-xs text-gray-600">total</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{url.stats.sources.qr}</div>
                <div className="text-xs text-gray-600">from the QR code</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{url.stats.sources.link}</div>
                <div className="text-xs text-gray-600">typed or clicked</div>
              </div>
            </div>
            <ClickChart daily={url.stats.daily} />
            <p className="mt-3 text-sm text-gray-600">
              {url.lastClickedAt
                ? `Last clicked ${dateTime(url.lastClickedAt)}`
                : "Not clicked yet"}
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-900">Change where it goes</h2>
            <p className="mt-1 text-sm text-gray-600">
              Got a new Zoom link or sign-up sheet? Paste it here. The short link, posters and QR
              codes keep working.
            </p>
            <form onSubmit={handleSave} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="destination" className="sr-only">
                New destination
              </label>
              <Input
                id="destination"
                type="url"
                inputMode="url"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-10 flex-1 text-base"
              />
              <Button
                type="submit"
                disabled={saving || !destination.trim() || destination.trim() === url.originalUrl}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </form>
            {saveMessage && (
              <p
                role={saveMessage.ok ? "status" : "alert"}
                className={
                  saveMessage.ok ? "mt-2 text-sm text-green-700" : "text-destructive mt-2 text-sm"
                }
              >
                {saveMessage.text}
              </p>
            )}
            {url.stats.history.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700">Earlier addresses</h3>
                <ul className="mt-1 space-y-1 text-sm text-gray-600">
                  {url.stats.history.map((h) => (
                    <li key={`${h.replacedAt}-${h.originalUrl}`} className="break-all">
                      {h.originalUrl}{" "}
                      <span className="text-gray-400">(until {dateTime(h.replacedAt)})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive gap-2"
              onClick={handleDelete}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete this link
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
