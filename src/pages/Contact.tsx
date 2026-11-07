import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { AlertCircle, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../lib/auth";

const TOPICS = [
  { value: "question", label: "Question" },
  { value: "feedback", label: "Feedback or idea" },
  { value: "report", label: "Report a link" },
] as const;
type Topic = (typeof TOPICS)[number]["value"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialTopic = TOPICS.some((t) => t.value === params.get("topic"))
    ? (params.get("topic") as Topic)
    : "question";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: people never see or fill this
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  // Save logged-in officers some typing.
  useEffect(() => {
    if (!user) return;
    setName((n) => n || user.displayName || "");
    setEmail((e) => e || user.email || "");
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email and message.");
      setStatus("error");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setError("");
    try {
      await axios.post("/api/contact", {
        name: name.trim(),
        email: email.trim(),
        topic,
        link: topic === "report" ? link.trim() : undefined,
        message: message.trim(),
        website,
      });
      setStatus("sent");
      setMessage("");
      setLink("");
    } catch (err) {
      const serverMessage = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setError(serverMessage ?? "Your message couldn't be sent. Please try again later.");
      setStatus("error");
    }
  };

  const sending = status === "sending";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contact</h1>
        <p className="mt-2 text-gray-600">
          Questions, ideas, or a link that shouldn&apos;t be here? Let us know.
        </p>
      </div>

      <Card className="p-6 shadow-md md:p-8">
        {status === "sent" ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Thank you, your message has been sent.</p>
              <p className="mt-1">We&apos;ll reply to {email} as soon as we can.</p>
              <button
                type="button"
                className="mt-3 text-green-900 underline"
                onClick={() => setStatus("idle")}
              >
                Send another message
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  disabled={sending}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={200}
                    disabled={sending}
                    className="h-11 pl-10 text-base"
                  />
                </div>
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">What is it about?</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {TOPICS.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 text-gray-700">
                    <input
                      type="radio"
                      name="topic"
                      value={t.value}
                      checked={topic === t.value}
                      onChange={() => setTopic(t.value)}
                      disabled={sending}
                      className="h-4 w-4 accent-[hsl(239_84%_67%)]"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {topic === "report" && (
              <div className="space-y-1.5">
                <label htmlFor="link" className="text-sm font-medium text-gray-700">
                  Short link you&apos;re reporting
                </label>
                <Input
                  id="link"
                  placeholder={`${window.location.host}/…`}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  maxLength={300}
                  disabled={sending}
                  className="h-11 text-base"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="message" className="text-sm font-medium text-gray-700">
                Message <span className="text-destructive">*</span>
              </label>
              <textarea
                id="message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                disabled={sending}
                placeholder={
                  topic === "report" ? "What's wrong with this link?" : "How can we help?"
                }
                className="block w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              />
            </div>

            {/* Honeypot for bots: hidden from people and screen readers. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {status === "error" && error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 p-4"
              >
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full gap-2" disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
