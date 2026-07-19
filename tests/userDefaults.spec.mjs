import assert from "node:assert/strict";
import { createDefaultNickname, isGeneratedNickname } from "../dist/domain/userDefaults.js";

const generatedFromName = createDefaultNickname({
  telegramId: 123456789,
  firstName: "Mike Smith",
  username: null,
  randomNumber: 1234,
});

assert.equal(generatedFromName, "Mike_1234");
assert.equal(
  createDefaultNickname({
    telegramId: 42,
    firstName: "",
    username: "moonlight_dev",
    randomNumber: 4321,
  }),
  "moonlight_4321"
);
assert.equal(
  createDefaultNickname({
    telegramId: 77,
    firstName: "!!!",
    username: null,
    randomNumber: 1111,
  }),
  "moon_1111"
);
assert.equal(isGeneratedNickname("Mike_1234"), true);
assert.equal(isGeneratedNickname("moon_9999"), true);
assert.equal(isGeneratedNickname("alice"), false);

console.log("userDefaults tests passed");
