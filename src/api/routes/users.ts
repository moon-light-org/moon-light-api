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

  router.post("/", async (req, res) => {
    try {
      const telegramReq = req as TelegramAuthRequest;
      const input = parseCreateUserInput(req.body);
      const telegramUser = telegramReq.telegram!.user;
      const user = await db.getOrCreateUser({
        telegramId: telegramUser.id,
        nickname: input.nickname ?? telegramUser.username ?? telegramUser.firstName,
        avatarUrl: input.avatarUrl ?? telegramUser.photoUrl,
      });
      res.status(200).json(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      const status = /required|object/.test(message)
        ? 400
        : /already taken/i.test(message)
        ? 409
        : 500;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
