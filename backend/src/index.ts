import "./env"; // must stay first: loads .env before other modules read process.env
import mongoose from "mongoose";
import { createApp } from "./app";

const { MONGO_URI, SESSION_SECRET } = process.env;
if (!MONGO_URI) throw new Error("MONGO_URI must be set");
if (!SESSION_SECRET) throw new Error("SESSION_SECRET must be set");

const app = createApp({
  sessionSecret: SESSION_SECRET,
  origin: process.env.ORIGIN,
  secureCookies: process.env.NODE_ENV === "production",
});

const PORT = process.env.PORT || 5001;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
