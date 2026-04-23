import { Router } from "express";
import { parseCreateLocationInput } from "../../domain/validation.js";
import type { DbService } from "../../services/db.js";

export function createLocationsRouter(db: DbService) {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const locations = await db.listApprovedLocations();
      res.json(locations);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch locations";
      res.status(500).json({ error: message });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const input = parseCreateLocationInput(req.body);
      const created = await db.createLocation(input);
      res.status(201).json(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create location";
      const status = /required|Invalid|must not exceed|object/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
