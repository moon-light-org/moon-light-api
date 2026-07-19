import { Router } from "express";
import { parseCreateUserInput } from "../../domain/validation.js";
import type { DbService } from "../../services/db.js";
import {
  requireTelegramAuth,
  type TelegramAuthRequest,
} from "../../middleware/telegramAuth.js";

export function createUsersRouter(db: DbService) {
  const router = Router();
  router.use(requireTelegramAuth);

  router.get("/me", async (req, res) => {
    try {
      const telegramReq = req as TelegramAuthRequest;
      const telegramUser = telegramReq.telegram!.user;
      const user = await db.getUserByTelegramId(telegramUser.id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.status(200).json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch user";
      res.status(500).json({ error: message });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const telegramReq = req as TelegramAuthRequest;
      const input = parseCreateUserInput(req.body);
      const telegramUser = telegramReq.telegram!.user;
      const user = await db.createUser({
        telegramId: telegramUser.id,
        firstName: telegramUser.firstName,
        username: telegramUser.username,
        nickname: input.nickname,
        avatarUrl: input.avatarUrl ?? null,
      });
      res.status(201).json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      const status = /required|object/.test(message)
        ? 400
        : /already taken|already exists/i.test(message)
        ? 409
        : 500;
      res.status(status).json({ error: message });
    }
  });

  router.patch("/me", async (req, res) => {
    try {
      const telegramReq = req as TelegramAuthRequest;
      const input = parseCreateUserInput(req.body);
      const telegramUser = telegramReq.telegram!.user;

      if (!input.nickname) {
        res.status(400).json({ error: "nickname must be between 2 and 32 characters" });
        return;
      }

      const user = await db.updateUserProfile({
        telegramId: telegramUser.id,
        firstName: telegramUser.firstName,
        username: telegramUser.username,
        nickname: input.nickname,
        avatarUrl: input.avatarUrl ?? null,
      });
      res.status(200).json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      const status = /required|object/.test(message)
        ? 400
        : /already taken/i.test(message)
        ? 409
        : /User not found/i.test(message)
        ? 404
        : 500;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
