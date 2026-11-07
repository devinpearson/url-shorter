import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import {
  type ContactTopic,
  markContactMessageEmailed,
  saveContactMessage,
} from "../db/contactMessages";
import { escapeHtml } from "../html";

const TOPICS: Record<ContactTopic, string> = {
  question: "Question",
  feedback: "Feedback",
  report: "Link report",
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Emails the message through Resend's HTTP API. Returns false when email isn't configured. */
async function sendEmail(msg: {
  name: string;
  email: string;
  topic: ContactTopic;
  link?: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const to = process.env.CONTACT_RECIPIENT_EMAIL || from;
  const label = TOPICS[msg.topic];
  const linkLine = msg.link ? `Link: ${msg.link}\n` : "";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Club Links <${from}>`,
      to,
      reply_to: msg.email,
      subject: `${label} from ${msg.name}`,
      text: `${label}\n\nFrom: ${msg.name} <${msg.email}>\n${linkLine}\n${msg.message}\n\n— Sent from the Club Links contact form`,
      html: `<h2>${label}</h2>
<p><strong>From:</strong> ${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt;</p>
${msg.link ? `<p><strong>Link:</strong> ${escapeHtml(msg.link)}</p>` : ""}
<p style="white-space:pre-wrap">${escapeHtml(msg.message)}</p>
<hr><p style="color:#6b7280;font-size:12px">Sent from the Club Links contact form</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
  return true;
}

/** Builds the contact router. Each call gets its own rate limiter, so tests can start fresh. */
export function contactRouter(pool: Pool) {
  const router = Router();

  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many messages. Please try again in an hour." },
  });

  router.post("/", contactLimiter, async (req, res, next) => {
    try {
      // Honeypot: bots fill every field. Pretend it worked so they don't retry.
      if (text(req.body?.website, 200)) {
        res.status(202).json({ message: "Thanks, your message has been sent." });
        return;
      }

      const name = text(req.body?.name, 100);
      const email = text(req.body?.email, 200);
      const message = text(req.body?.message, 5000);
      const topic = req.body?.topic as ContactTopic;
      const link = topic === "report" ? text(req.body?.link, 300) || undefined : undefined;

      if (!name || !email || !message) {
        res.status(400).json({ message: "Please fill in your name, email and message." });
        return;
      }
      if (!EMAIL_PATTERN.test(email)) {
        res.status(400).json({ message: "Please enter a valid email address." });
        return;
      }
      if (!Object.hasOwn(TOPICS, topic)) {
        res.status(400).json({ message: "Please choose what your message is about." });
        return;
      }

      // Save first so nothing is lost if email delivery fails.
      const id = await saveContactMessage(pool, {
        name,
        email,
        topic,
        link,
        message,
        userId: req.user?.id,
      });

      try {
        if (await sendEmail({ name, email, topic, link, message })) {
          await markContactMessageEmailed(pool, id);
        } else {
          console.warn(
            `Contact message ${id} saved; RESEND_API_KEY not set, so no email was sent.`,
          );
        }
      } catch (err) {
        console.error(`Contact message ${id} saved but the email failed:`, err);
      }

      res.status(201).json({ message: "Thanks, your message has been sent." });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
