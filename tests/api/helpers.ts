import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { createApp } from "../../backend/src/app";

/**
 * Starts an in-memory MongoDB for one test file, and builds a fresh Express app and empties
 * the database before each test. Use `api()` for anonymous requests and `loggedIn()` for an
 * agent that keeps a logged-in session cookie.
 */
export function setupApi() {
  let mongo: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("club-links-test"));
  });

  beforeEach(async () => {
    // A fresh app per test also resets the rate limiters.
    app = createApp({ sessionSecret: "test-secret", enableTestLogin: true });
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
    // Unique indexes (shortId, email) must exist for duplicate checks.
    await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  return {
    api: () => request(app),
    async loggedIn(user: { id?: string; displayName?: string; email?: string } = {}) {
      const agent = request.agent(app);
      await agent.post("/api/test/login").send(user).expect(200);
      return agent;
    },
  };
}
