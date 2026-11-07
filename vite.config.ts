import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ProxyOptions } from "vite";
import { APP_PAGES } from "./backend/src/appPages";

// The backend the dev and preview servers forward to. Tests point this at their own server.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:5001";

// The React app's pages (backend/src/appPages.ts) stay with Vite. Everything else that looks
// like a short link (/club-roles) goes to the backend, which redirects it, the same split the
// backend makes in production.
// Vite builds the RegExp without flags, so match pages case-insensitively letter by letter
// (/About is the About page, like React Router), while short links are lowercased by the backend.
const anyCase = (word: string) => [...word].map((c) => `[${c}${c.toUpperCase()}]`).join("");
const SHORT_LINK = `^/(?!(?:${APP_PAGES.map(anyCase).join("|")})(?:[?#]|$))[A-Za-z0-9_-]{3,32}\\+?(?:\\?.*)?$`;

const proxy: Record<string, ProxyOptions | string> = {
  "/api": apiTarget,
  [SHORT_LINK]: apiTarget,
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
});
