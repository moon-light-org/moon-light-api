import type { NextFunction, Request, Response } from "express";
import { parse, validate } from "@tma.js/init-data-node";

export type TelegramAuthContext = {
  initData: string;
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    photoUrl: string | null;
  };
};

export type TelegramAuthRequest = Request & {
  telegram?: TelegramAuthContext;
};

const TELEGRAM_INIT_DATA_TTL_SECONDS = 3600;

function getBotToken(): string {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN missing in environment");
  }
  return token;
}

export function softTelegramAuth(req: TelegramAuthRequest, res: Response, next: NextFunction) {
  const initDataHeader = req.header("x-telegram-init-data");
  if (!initDataHeader || initDataHeader.trim().length === 0) {
    next();
    return;
  }

  try {
    const initData = initDataHeader.trim();
    validate(initData, getBotToken(), { expiresIn: TELEGRAM_INIT_DATA_TTL_SECONDS });
    const parsed = parse(initData);
    const rawUser = parsed.user;
    if (!rawUser || rawUser.id === undefined || rawUser.id === null) {
      res.status(401).json({ error: "Unauthorized: Telegram user missing in init data" });
      return;
    }

    const toNullableString = (value: unknown): string | null =>
      typeof value === "string" && value.trim().length > 0 ? value : null;
    const firstName =
      typeof rawUser.firstName === "string" && rawUser.firstName.trim().length > 0
        ? rawUser.firstName
        : typeof rawUser.username === "string" && rawUser.username.trim().length > 0
        ? rawUser.username
        : "Telegram User";

    req.telegram = {
      initData,
      user: {
        id: String(rawUser.id),
        firstName,
        lastName: toNullableString(rawUser.lastName),
        username: toNullableString(rawUser.username),
        photoUrl: toNullableString(rawUser.photoUrl),
      },
    };
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Telegram init data";
    res.status(401).json({ error: `Unauthorized: ${message}` });
  }
}

export function requireTelegramAuth(req: TelegramAuthRequest, res: Response, next: NextFunction) {
  if (!req.telegram?.user?.id) {
    res.status(401).json({ error: "Unauthorized: Telegram auth required" });
    return;
  }
  next();
}
