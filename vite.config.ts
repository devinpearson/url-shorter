import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The backend the dev and preview servers forward /api to. Tests point this at their own server.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:5001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": apiTarget },
  },
  preview: {
    proxy: { "/api": apiTarget },
  },
});
