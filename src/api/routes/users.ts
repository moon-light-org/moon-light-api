import { Router } from "express";
import { parseCreateUserInput } from "../../domain/validation.js";
import type { DbService } from "../../services/db.js";

export function createUsersRouter(db: DbService) {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const input = parseCreateUserInput(req.body);
      const user = await db.getOrCreateUser(input);
      res.status(200).json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      const status = /required|object/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
