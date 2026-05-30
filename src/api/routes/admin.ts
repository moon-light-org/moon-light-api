import { Router } from "express";
import type { DbService } from "../../services/db.js";
import { requireTelegramAuth, type TelegramAuthRequest } from "../../middleware/telegramAuth.js";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseId(value: unknown, field: string): number {
  const id = toFiniteNumber(value);
  if (id === null || id <= 0) {
    throw new Error(`Invalid ${field}`);
  }
  return Math.trunc(id);
}

function parseRole(raw: unknown): "admin" | "user" {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be an object");
  }
  const role = (raw as Record<string, unknown>).role;
  if (role === "admin" || role === "user") {
    return role;
  }
  throw new Error("Invalid role: expected admin or user");
}

function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").trim().toLowerCase() === "admin";
}

export function createAdminRouter(db: DbService) {
  const router = Router();
  router.use(requireTelegramAuth);

  router.use(async (req, res, next) => {
    try {
      const telegramReq = req as TelegramAuthRequest;
      const telegramId = telegramReq.telegram?.user.id;
      if (!telegramId) {
        res.status(401).json({ error: "Missing Telegram user" });
        return;
      }
      const user = await db.getUserByTelegramId(telegramId);
      if (!user || !isAdminRole(user.role)) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      next();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to validate admin access");
      res.status(500).json({ error: message });
    }
  });

  router.get("/members", async (_req, res) => {
    try {
      const users = await db.listUsers();
      res.json(users);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch members");
      res.status(500).json({ error: message });
    }
  });

  router.patch("/members/:userId/role", async (req, res) => {
    try {
      const userId = parseId(req.params.userId, "user id");
      const role = parseRole(req.body);
      const updated = await db.updateUserRole(userId, role);
      res.json(updated);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update role");
      const status = /Invalid user id|Invalid role|object/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  router.get("/locations", async (req, res) => {
    try {
      const limit = toFiniteNumber(req.query.limit);
      const locations = await db.listAllLocations(
        limit !== null ? { limit: Math.max(1, Math.trunc(limit)) } : undefined
      );
      res.json(locations);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch locations");
      res.status(500).json({ error: message });
    }
  });

  router.get("/locations/:locationId/reviews", async (req, res) => {
    try {
      const locationId = parseId(req.params.locationId, "location id");
      const reviews = await db.listLocationReviews(locationId);
      res.json(reviews);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch reviews");
      const status = /Invalid location id/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  router.delete("/locations/:locationId", async (req, res) => {
    try {
      const locationId = parseId(req.params.locationId, "location id");
      await db.deleteLocationById(locationId);
      res.status(204).send();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete location");
      const status = /Invalid location id/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  router.delete("/reviews/:reviewId", async (req, res) => {
    try {
      const reviewId = parseId(req.params.reviewId, "review id");
      await db.deleteLocationReviewById(reviewId);
      res.status(204).send();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete review");
      const status = /Invalid review id/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
