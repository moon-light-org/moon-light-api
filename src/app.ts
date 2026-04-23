import express from "express";
import cors from "cors";
import { softTelegramAuth } from "./middleware/telegramAuth.js";
import { createUsersRouter } from "./api/routes/users.js";
import { createLocationsRouter } from "./api/routes/locations.js";
import type { DbService } from "./services/db.js";

export function createApp(db: DbService) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(softTelegramAuth);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/users", createUsersRouter(db));
  app.use("/api/locations", createLocationsRouter(db));

  return app;
}
