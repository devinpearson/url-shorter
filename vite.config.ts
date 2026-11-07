import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ProxyOptions } from "vite";

// The backend the dev and preview servers forward to. Tests point this at their own server.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:5001";

// Pages the React app serves at a single path segment. Everything else that looks like a
// short link (/club-roles) goes to the backend, which redirects it: the same split as
// deploy/nginx/toast.li.conf. Keep in sync with src/main.tsx and RESERVED_SHORT_IDS.
const APP_PAGES = ["dashboard", "login", "about", "contact", "terms", "stats"];
const SHORT_LINK = `^/(?!(?:${APP_PAGES.join("|")})(?:[?#]|$))[A-Za-z0-9_-]{3,32}(?:\\?.*)?$`;

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
