import type { NextFunction, Request, Response } from "express";

export type SoftTelegramContext = {
  initData: string | null;
};

export type SoftTelegramRequest = Request & {
  telegram?: SoftTelegramContext;
};

export function softTelegramAuth(req: SoftTelegramRequest, _res: Response, next: NextFunction) {
  const initDataHeader = req.header("x-telegram-init-data") ?? null;
  req.telegram = { initData: initDataHeader };
  next();
}
