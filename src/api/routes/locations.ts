import { Router } from "express";
import {
  parseCreateLocationInput,
  parseCreateLocationReportInput,
  parseCreateLocationReviewInput,
} from "../../domain/validation.js";
import type { DbService, LocationQuery } from "../../services/db.js";
import {
  requireTelegramAuth,
  type TelegramAuthRequest,
} from "../../middleware/telegramAuth.js";

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

function logRouteError(scope: string, error: unknown) {
  const payload =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : typeof error === "object" && error !== null
      ? error
      : { error };

  console.error(`[locations:${scope}]`, payload);
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

function parseLocationQuery(raw: Record<string, unknown>): LocationQuery {
  const query: LocationQuery = {};

  const minLat = toFiniteNumber(raw.minLat);
  const minLon = toFiniteNumber(raw.minLon);
  const maxLat = toFiniteNumber(raw.maxLat);
  const maxLon = toFiniteNumber(raw.maxLon);

  if (minLat !== null && minLon !== null && maxLat !== null && maxLon !== null) {
    query.bbox = { minLat, minLon, maxLat, maxLon };
  }

  if (typeof raw.q === "string" && raw.q.trim().length > 0) {
    query.search = raw.q.trim();
  }

  const limit = toFiniteNumber(raw.limit);
  if (limit !== null) {
    query.limit = Math.max(1, Math.trunc(limit));
  }

  return query;
}

function parseLocationId(value: unknown): number {
  const id = toFiniteNumber(value);
  if (id === null || id <= 0) {
    throw new Error("Invalid location id");
  }
  return Math.trunc(id);
}

export function createLocationsRouter(db: DbService) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const query = parseLocationQuery(req.query as Record<string, unknown>);
      const locations = await db.listApprovedLocations(query);
      res.json(locations);
    } catch (error) {
      logRouteError("GET /", error);
      const message = getErrorMessage(error, "Failed to fetch locations");
      res.status(500).json({ error: message });
    }
  });

  router.post("/", requireTelegramAuth, async (req, res) => {
    try {
      const telegramReq = req as TelegramAuthRequest;
      const input = parseCreateLocationInput(req.body);
      const created = await db.createLocation({
        telegramId: telegramReq.telegram!.user.id,
        ...input,
      });
      res.status(201).json(created);
    } catch (error) {
      logRouteError("POST /", error);
      const message = getErrorMessage(error, "Failed to create location");
      const status = /required|Invalid|must not exceed|object/.test(message)
        ? 400
        : /User not found/i.test(message)
        ? 404
        : 500;
      res.status(status).json({ error: message });
    }
  });

  router.get("/:locationId/photos", async (req, res) => {
    try {
      const locationId = parseLocationId(req.params.locationId);
      const photos = await db.listLocationPhotos(locationId);
      res.json(photos);
    } catch (error) {
      logRouteError("GET /:locationId/photos", error);
      const message = getErrorMessage(error, "Failed to fetch photos");
      const status = /Invalid location id/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  router.get("/:locationId/reviews", async (req, res) => {
    try {
      const locationId = parseLocationId(req.params.locationId);
      const reviews = await db.listLocationReviews(locationId);
      res.json(reviews);
    } catch (error) {
      logRouteError("GET /:locationId/reviews", error);
      const message = getErrorMessage(error, "Failed to fetch reviews");
      const status = /Invalid location id/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  router.post("/:locationId/reviews", requireTelegramAuth, async (req, res) => {
    try {
      const locationId = parseLocationId(req.params.locationId);
      const telegramReq = req as TelegramAuthRequest;
      const input = parseCreateLocationReviewInput(req.body);
      const created = await db.addLocationReview({
        telegramId: telegramReq.telegram!.user.id,
        locationId,
        paymentStatus: input.paymentStatus,
        wallet: input.wallet,
        rating: input.rating,
        text: input.text,
      });
      res.status(201).json(created);
    } catch (error) {
      logRouteError("POST /:locationId/reviews", error);
      const message = getErrorMessage(error, "Failed to add review");
      const status = /Invalid location id|Comment text is required|rating must|must not exceed|object/.test(message)
        ? 400
        : /User not found/i.test(message)
        ? 404
        : 500;
      res.status(status).json({ error: message });
    }
  });

  router.post("/:locationId/reports", requireTelegramAuth, async (req, res) => {
    try {
      const locationId = parseLocationId(req.params.locationId);
      const telegramReq = req as TelegramAuthRequest;
      const input = parseCreateLocationReportInput(req.body);
      const created = await db.addLocationReport({
        telegramId: telegramReq.telegram!.user.id,
        locationId,
        reasons: input.reasons,
        text: input.text,
      });
      res.status(201).json(created);
    } catch (error) {
      logRouteError("POST /:locationId/reports", error);
      const message = getErrorMessage(error, "Failed to report location");
      const status = /Invalid location id|reasons|report reason|must not exceed|object/.test(message)
        ? 400
        : /User not found/i.test(message)
        ? 404
        : 500;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
