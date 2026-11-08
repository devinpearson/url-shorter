import { Users } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { apiErrorMessage, type ClubSummary, createClub, fetchClubs } from "../lib/api";
import { useAuth } from "../lib/auth";
import { normalizeShortName, shortNameProblem, tidyShortNameInput } from "../lib/shortNames";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Clubs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ClubSummary[] | null>(null);
  const [name, setName] = useState("");
  // The page address follows the name until someone edits it themselves.
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchClubs()
      .then(setClubs)
      .catch((err) => setError(apiErrorMessage(err)));
  }, [user]);

  if (user === null) return <Navigate to="/login?next=/clubs" replace />;

  const address = slug ?? normalizeShortName(name).slice(0, 32);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    const finalSlug = normalizeShortName(address);
    const problem = shortNameProblem(finalSlug) ?? (finalSlug ? null : "Choose a page address.");
    if (problem) {
      setError(`Club page address: ${problem}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const club = await createClub({ name: name.trim(), slug: finalSlug });
      navigate(`/clubs/${club.slug}`);
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your clubs</h1>
        <p className="mt-1 text-gray-600">
          Links made for a club stay with the club when officers change. Every officer you invite
          can update them, and the club gets its own page listing them.
        </p>
      </div>

      {clubs && clubs.length > 0 && (
        <ul className="space-y-3">
          {clubs.map((club) => (
            <li key={club.id}>
              <Link to={`/clubs/${club.slug}`} className="block">
                <Card className="hover:border-primary flex items-center gap-4 p-4">
                  <span className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                    <Users className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900">{club.name}</span>
                    <span className="text-sm text-gray-600">
                      {plural(club.memberCount, "officer")} · {plural(club.linkCount, "link")}
                    </span>
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card className="p-6">
        <h2 className="font-semibold text-gray-900">
          {clubs?.length ? "Add another club" : "Set up your club"}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          If your club is already here, ask one of its officers for an invite link instead.
        </p>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <div>
            <label htmlFor="club-name" className="text-sm font-medium text-gray-700">
              Club name
            </label>
            <Input
              id="club-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunrise Speakers"
              maxLength={100}
              className="mt-1 text-base"
            />
          </div>
          <div>
            <label htmlFor="club-slug" className="text-sm font-medium text-gray-700">
              Club page address
            </label>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-sm text-gray-600">{window.location.host}/c/</span>
              <Input
                id="club-slug"
                value={address}
                onChange={(e) => setSlug(tidyShortNameInput(e.target.value))}
                placeholder="sunrise-speakers"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={32}
                className="flex-1 text-base"
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={!name.trim() || saving}>
            {saving ? "Creating…" : "Create club"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
