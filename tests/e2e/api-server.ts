/**
 * Backend for the Playwright and Lighthouse runs: the real Express app on an in-memory
 * MongoDB, with POST /api/test/login so tests can log in without Auth0.
 *
 *   npx tsx tests/e2e/api-server.ts      (port from E2E_API_PORT, default 5101)
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// passport-auth0 refuses to start without these; tests never reach Auth0.
process.env.AUTH0_DOMAIN ??= "club-links-test.auth0.invalid";
process.env.AUTH0_CLIENT_ID ??= "test-client";
process.env.AUTH0_CLIENT_SECRET ??= "test-secret";
process.env.AUTH0_CALLBACK_URL ??= "http://127.0.0.1:5100/api/auth/callback";
process.env.ORIGIN ??= "http://127.0.0.1:5100";

const port = Number(process.env.E2E_API_PORT ?? 5101);

const { createApp } = await import("../../backend/src/app");

const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri("club-links-e2e"));

const app = createApp({
  sessionSecret: "e2e-secret",
  origin: process.env.ORIGIN,
  enableTestLogin: true,
});

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`E2E API listening on http://127.0.0.1:${port}`);
});

async function shutdown() {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
