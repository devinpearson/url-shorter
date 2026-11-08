import axios from "axios";
import { Check, Copy, ExternalLink, UserPlus } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { QrCode } from "../components/QrCode";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  apiErrorMessage,
  type ClubDetail,
  cancelInvite,
  clubPagePath,
  createInvite,
  fetchClub,
  inviteLink,
  removeMember,
  renameClub,
  type ShortUrl,
  shortLinkLabel,
} from "../lib/api";
import { useAuth } from "../lib/auth";

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

/** A freshly made invite link, with a copy button. It can't be shown again once it's gone. */
function NewInvite({ token, expiresAt }: { token: string; expiresAt: string }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(token);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      /* Clipboard blocked: the link is on screen to select. */
    }
  };
  return (
    <div className="bg-accent mt-3 rounded-md p-3">
      <label htmlFor="invite-link" className="text-sm font-medium text-gray-900">
        Send this link to the new officer
      </label>
      <div className="mt-1 flex gap-2">
        <Input
          id="invite-link"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="flex-1 bg-white text-sm"
        />
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-600">
        It works once, until {date(expiresAt)}. Copy it now: for safety it isn&apos;t shown again.
      </p>
    </div>
  );
}

export default function Club() {
  const { user } = useAuth();
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [links, setLinks] = useState<ShortUrl[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ token: string; expiresAt: string } | null>(null);
  const [name, setName] = useState("");
  const [renamed, setRenamed] = useState(false);

  const load = useCallback(async () => {
    const [detail, all] = await Promise.all([
      fetchClub(slug),
      axios.get<ShortUrl[]>("/api/urls").then((res) => (Array.isArray(res.data) ? res.data : [])),
    ]);
    setClub(detail);
    setName(detail.name);
    setLinks(all.filter((link) => link.clubId === detail.id));
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    load().catch((err) =>
      setLoadError(
        axios.isAxiosError(err) && err.response?.status === 404
          ? "That club doesn't exist, or you're not one of its officers. Ask an officer for an invite link."
          : "Couldn't load this club. Please try again.",
      ),
    );
  }, [user, load]);

  if (user === null) return <Navigate to={`/login?next=/clubs/${slug}`} replace />;

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleInvite = () =>
    act(async () => {
      setInvite(await createInvite(slug));
      await load();
    });

  const handleCancel = (inviteId: string) =>
    act(async () => {
      await cancelInvite(slug, inviteId);
      await load();
    });

  const handleRemove = (member: ClubDetail["members"][number]) =>
    act(async () => {
      if (!club) return;
      const leaving = member.id === user?.id;
      const sure = window.confirm(
        leaving
          ? `Leave ${club.name}? You won't be able to change its links any more.`
          : `Take ${member.displayName} off ${club.name}? They won't be able to change its links.`,
      );
      if (!sure) return;
      await removeMember(slug, member.id);
      if (leaving) navigate("/clubs", { replace: true });
      else await load();
    });

  const handleRename = (e: FormEvent) => {
    e.preventDefault();
    act(async () => {
      const updated = await renameClub(slug, name);
      setClub((prev) => prev && { ...prev, name: updated.name });
      setRenamed(true);
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Link to="/clubs" className="text-primary text-sm hover:underline">
        ← Your clubs
      </Link>

      {loadError ? (
        <Card className="p-6">
          <p role="alert" className="text-destructive">
            {loadError}
          </p>
        </Card>
      ) : !club ? (
        <Card className="p-6">
          <p className="text-muted-foreground">Loading…</p>
        </Card>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
          {error && (
            <p
              role="alert"
              className="text-destructive bg-destructive/10 border-destructive rounded border px-4 py-2"
            >
              {error}
            </p>
          )}

          <Card className="p-6">
            <h2 className="font-semibold text-gray-900">Club page</h2>
            <p className="mt-1 text-sm text-gray-600">
              One address for your poster or social media bio, listing the club links you choose.
            </p>
            <a
              href={`/${clubPagePath(club.slug)}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary mt-2 inline-flex items-center gap-1 text-lg font-semibold break-all hover:underline"
            >
              {shortLinkLabel(clubPagePath(club.slug))}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            <QrCode path={clubPagePath(club.slug)} trackScans={false} size={136} className="mt-4" />
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-900">The club&apos;s links</h2>
            {links.length === 0 ? (
              <p className="mt-1 text-sm text-gray-600">
                None yet. On{" "}
                <Link to={`/dashboard?club=${club.slug}`} className="text-primary hover:underline">
                  your dashboard
                </Link>
                , choose this club when you make a link, or open one of your links and give it to
                the club.
              </p>
            ) : (
              <ul className="divide-border mt-2 divide-y">
                {links.map((link) => (
                  <li key={link.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900">
                        {link.title || shortLinkLabel(link.shortId)}
                      </span>
                      {link.title && (
                        <span className="block truncate text-sm text-gray-600">
                          {shortLinkLabel(link.shortId)}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-sm">
                      {link.onClubPage && <span className="text-gray-600">On club page</span>}
                      <Link
                        to={`/stats/${link.shortId}`}
                        className="text-primary hover:underline"
                        aria-label={`Manage ${link.shortId}`}
                      >
                        Manage
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-900">Officers</h2>
            <p className="mt-1 text-sm text-gray-600">
              Everyone here can change, add and delete the club&apos;s links, and invite others.
            </p>
            <ul className="divide-border mt-2 divide-y">
              {club.members.map((member) => {
                const isYou = member.id === user?.id;
                return (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900">
                        {member.displayName}
                        {isYou && " (you)"}
                      </span>
                      <span className="text-sm text-gray-600">Joined {date(member.joinedAt)}</span>
                    </span>
                    {club.members.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleRemove(member)}
                      >
                        {isYou ? "Leave club" : `Remove ${member.displayName}`}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="border-border mt-4 border-t pt-4">
              <Button onClick={handleInvite} className="gap-2">
                <UserPlus className="size-4" aria-hidden="true" />
                Invite an officer
              </Button>
              {invite && <NewInvite {...invite} />}
              {club.invites.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700">Invites not used yet</h3>
                  <ul className="mt-1 space-y-1 text-sm text-gray-600">
                    {club.invites.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-3">
                        <span>
                          Made {date(i.createdAt)}
                          {i.createdBy && ` by ${i.createdBy}`}, works until {date(i.expiresAt)}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(i.id)}>
                          Cancel
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-900">Handing over to the next committee</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600">
              <li>Invite the incoming officer and send them the link.</li>
              <li>Once they appear under Officers, choose &ldquo;Leave club&rdquo;.</li>
            </ol>
            <p className="mt-2 text-sm text-gray-600">
              The club&apos;s links, posters and QR codes keep working throughout.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-900">Club name</h2>
            <form onSubmit={handleRename} className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="rename" className="sr-only">
                Club name
              </label>
              <Input
                id="rename"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setRenamed(false);
                }}
                maxLength={100}
                className="h-10 flex-1 text-base"
              />
              <Button type="submit" disabled={!name.trim() || name.trim() === club.name}>
                Rename
              </Button>
            </form>
            {renamed && (
              <p role="status" className="mt-2 text-sm text-green-700">
                Renamed. The club page address stays the same.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
