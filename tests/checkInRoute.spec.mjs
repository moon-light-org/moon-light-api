import assert from "node:assert/strict";
import { once } from "node:events";
import { sign } from "@tma.js/init-data-node";
import { createApp } from "../dist/app.js";
import { CheckInError } from "../dist/domain/checkIn.js";

process.env.BOT_TOKEN = "123:test-token";
let submitted = null;
let cooldown = false;
const db = {
  async createLocationCheckIn(input) {
    submitted = input;
    if (cooldown) throw new CheckInError("Come back tomorrow.", 409);
    return { id: 7, checkedInAt: "2026-11-04T00:00:00Z", nextEligibleAt: "2026-11-05T00:00:00Z" };
  },
};
const server = createApp(db).listen(0, "127.0.0.1");
await once(server, "listening");
const url = `http://127.0.0.1:${server.address().port}/api/locations/42/check-ins`;
const initData = sign({ user: { id: 123, first_name: "Test" }, signature: "AAAA" }, process.env.BOT_TOKEN, new Date());
const position = { latitude: 51.5, longitude: -0.1, accuracyMeters: 8 };
const post = (body, auth = true) => fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(auth ? { "X-Telegram-Init-Data": initData } : {}) },
  body: JSON.stringify(body),
});

try {
  assert.equal((await post(position, false)).status, 401);
  assert.equal((await post({ ...position, accuracyMeters: null })).status, 201);
  assert.deepEqual(submitted, { telegramId: "123", locationId: 42, ...position, accuracyMeters: null });
  assert.equal((await post({ ...position, accuracyMeters: -1 })).status, 400);
  cooldown = true;
  assert.equal((await post(position)).status, 409);
} finally {
  server.close();
}

console.log("check-in route tests passed");
