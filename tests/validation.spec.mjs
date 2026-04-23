import assert from "node:assert/strict";
import {
  parseCreateLocationInput,
  parseCreateUserInput,
  allowedLocationCategories,
} from "../dist/domain/validation.js";

function run() {
  {
    const parsed = parseCreateUserInput({
      telegramId: " 123456 ",
      nickname: "  Satoshi  ",
      avatarUrl: "https://example.com/avatar.png",
    });

    assert.equal(parsed.telegramId, "123456");
    assert.equal(parsed.nickname, "Satoshi");
    assert.equal(parsed.avatarUrl, "https://example.com/avatar.png");
  }

  {
    const parsed = parseCreateUserInput({ telegramId: "123" });
    assert.equal(parsed.nickname, "user_123");
  }

  assert.throws(
    () =>
      parseCreateLocationInput({
        telegramId: "123",
        name: "BTC Cafe",
        latitude: 33.6844,
        longitude: 73.0479,
        category: "invalid",
      }),
    /category/
  );

  assert.throws(
    () =>
      parseCreateLocationInput({
        telegramId: "123",
        name: "BTC Cafe",
        latitude: 120,
        longitude: 73.0479,
        category: "other",
      }),
    /latitude/
  );

  for (const category of allowedLocationCategories) {
    const parsed = parseCreateLocationInput({
      telegramId: "123",
      name: "Sample",
      latitude: 33.6844,
      longitude: 73.0479,
      category,
    });
    assert.equal(parsed.category, category);
  }

  console.log("validation.spec.mjs: all assertions passed");
}

run();
