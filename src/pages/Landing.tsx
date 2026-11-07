import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  Link2,
  Loader2,
  UserPlus,
  Video,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QrCode } from "../components/QrCode";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  apiErrorMessage,
  createShortUrl,
  type NewShortUrl,
  type ShortUrl,
  savePendingLink,
  shortLink,
  shortLinkLabel,
  startLogin,
  takePendingLink,
  takeReturnTo,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { normalizeShortName, shortNameProblem, tidyShortNameInput } from "../lib/shortNames";

const EXAMPLES = [
  {
    icon: CalendarDays,
    title: "Meeting sign-up",
    description: "Share one link for members to book speaking and functionary roles.",
    name: "club-roles",
  },
  {
    icon: Video,
    title: "Online meetings",
    description: "Put a short, readable link on slides and announcements for hybrid meetings.",
    name: "club-online",
  },
  {
    icon: UserPlus,
    title: "Guest invitations",
    description:
      "Point visitors at your meeting details or guest form from a flyer or social post.",
    name: "visit-us",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [originalUrl, setOriginalUrl] = useState("");
  const [customShortId, setCustomShortId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ShortUrl | null>(null);
  const [copied, setCopied] = useState(false);
  const handledLogin = useRef(false);
  const urlInput = useRef<HTMLInputElement>(null);

  const create = useCallback(async (link: NewShortUrl) => {
    setSubmitting(true);
    setError(null);
    setCreated(null);
    try {
      setCreated(await createShortUrl(link));
      setOriginalUrl("");
      setCustomShortId("");
    } catch (err) {
      // Put the input back so the officer can fix it and try again.
      setOriginalUrl(link.originalUrl);
      setCustomShortId(link.customShortId ?? "");
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, []);

  // After returning from Auth0: finish the link they started, or go where they were heading.
  useEffect(() => {
    if (user === undefined || handledLogin.current) return;
    handledLogin.current = true;

    const pending = takePendingLink();
    if (user && pending) {
      takeReturnTo();
      void create(pending);
      return;
    }
    if (pending) {
      // Login didn't complete: keep what they typed.
      setOriginalUrl(pending.originalUrl);
      setCustomShortId(pending.customShortId ?? "");
    }
    const returnTo = takeReturnTo();
    if (user && returnTo && returnTo !== "/") navigate(returnTo, { replace: true });
  }, [user, navigate, create]);

  const chosenName = normalizeShortName(customShortId);
  const customIdError = shortNameProblem(chosenName);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!originalUrl.trim() || customIdError || submitting) return;
    const link = { originalUrl, customShortId: chosenName };
    if (!user) {
      savePendingLink(link);
      startLogin("/");
      return;
    }
    void create(link);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it instead.");
    }
  };

  const applyExample = (name: string) => {
    setCustomShortId(name);
    setCreated(null);
    urlInput.current?.focus();
    urlInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const host = window.location.host;

  return (
    <>
      {/* Hero + shorten form */}
      <section className="px-4 pt-10 pb-16 sm:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary text-sm font-medium">For Toastmasters clubs</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Short links for your club meetings
          </h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">
            Turn a long Zoom link, sign-up sheet or guest form into a short link that&apos;s easy to
            read on a poster, type in and say aloud.
          </p>
        </div>

        <Card className="mx-auto mt-10 max-w-2xl p-5 shadow-md sm:p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="originalUrl" className="text-sm font-medium text-gray-700">
                Paste your long link
              </label>
              <Input
                ref={urlInput}
                id="originalUrl"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://us02web.zoom.us/j/…"
                aria-describedby="originalUrl-help"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                className="h-11 text-base"
                required
              />
              <p id="originalUrl-help" className="text-sm text-gray-500">
                For example, your Zoom meeting invite link, a sign-up sheet or a guest form.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="customShortId" className="text-sm font-medium text-gray-700">
                Choose a short name <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <div className="border-input bg-background focus-within:ring-ring flex h-11 items-center rounded-md border focus-within:ring-2 focus-within:ring-offset-2">
                <span className="max-w-[45%] shrink-0 truncate pl-3 text-base font-medium text-gray-700">
                  {host}/
                </span>
                <input
                  id="customShortId"
                  type="text"
                  placeholder="sunrise-zoom"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={customShortId}
                  onChange={(e) => setCustomShortId(tidyShortNameInput(e.target.value))}
                  maxLength={32}
                  aria-invalid={Boolean(customIdError)}
                  aria-describedby="customShortId-help"
                  className="text-foreground h-full min-w-0 flex-1 bg-transparent pr-3 text-base placeholder:text-gray-400 placeholder:italic focus:outline-none"
                />
              </div>
              <p
                id="customShortId-help"
                className={customIdError ? "text-destructive text-sm" : "text-sm text-gray-500"}
              >
                {customIdError ??
                  (chosenName
                    ? `Your link will be ${host}/${chosenName}`
                    : "Letters, numbers and dashes. Leave it blank and we'll pick an easy one, like brave-otter-47.")}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="border-destructive bg-destructive/10 text-destructive rounded-md border px-4 py-2 text-sm"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={
                !originalUrl.trim() || Boolean(customIdError) || submitting || user === undefined
              }
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Link2 className="size-4" aria-hidden="true" />
              )}
              {user ? "Shorten link" : "Log in and shorten"}
            </Button>
            <p className="text-center text-sm text-gray-500">
              {user === null &&
                "You'll log in once, then come straight back with your link ready. "}
              By shortening a link you agree to the{" "}
              <Link to="/terms" className="text-primary underline">
                Terms of Use
              </Link>
              .
            </p>
          </form>

          {created && (
            <div
              className="border-primary/30 bg-primary/5 mt-6 rounded-md border p-4"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-gray-700">Your short link is ready</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={shortLink(created.shortId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary min-w-0 flex-1 text-2xl font-bold tracking-tight break-all hover:underline sm:text-3xl"
                >
                  {shortLinkLabel(created.shortId)}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleCopy(shortLink(created.shortId))}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Put this on your poster. Capital letters don&apos;t matter, so people can type it
                however they like.
              </p>
              <p className="mt-1 truncate text-sm text-gray-500">→ {created.originalUrl}</p>
              <QrCode shortId={created.shortId} size={136} className="mt-4" />
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <Link to={`/stats/${created.shortId}`} className="text-primary hover:underline">
                  Manage this link
                </Link>
                <Link to="/dashboard" className="text-primary hover:underline">
                  All your links
                </Link>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Use cases */}
      <section className="bg-muted px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-gray-900">
            Links your members will actually remember
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {EXAMPLES.map(({ icon: Icon, title, description, name }) => (
              <Card key={name} className="flex flex-col p-5">
                <Icon className="text-primary size-6" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 flex-1 text-sm text-gray-600">{description}</p>
                <button
                  type="button"
                  onClick={() => applyExample(name)}
                  className="text-primary focus-visible:ring-ring mt-4 self-start rounded text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  {host}/{name}
                </button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-gray-900">How it works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Link2,
                title: "Paste your link",
                text: "Any sign-up sheet, meeting link, form or page.",
              },
              {
                icon: ArrowRight,
                title: "Pick a name",
                text: "Choose something easy to say, or get a random one.",
              },
              {
                icon: BarChart3,
                title: "Share and track",
                text: "See how many people clicked from your dashboard.",
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="text-center">
                <div className="bg-primary/10 text-primary mx-auto flex size-10 items-center justify-center rounded-full">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-semibold text-gray-900">
                  {i + 1}. {title}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
