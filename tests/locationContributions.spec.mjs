import assert from "node:assert/strict";
import { LocationMainCategory } from "../dist/domain/types.js";
import {
  parseCreateLocationInput,
  parseCreateLocationReviewInput,
} from "../dist/domain/validation.js";

const locationBody = {
  name: "Moon Cafe",
  description: null,
  latitude: 51.5,
  longitude: -0.1,
  category: "restaurant-bar",
  mainCategory: LocationMainCategory.FoodDrink,
  websiteUrl: null,
  imageUrl: null,
  schedules: null,
};

assert.deepEqual(
  Object.values(LocationMainCategory),
  ["accommodation", "bitcoin", "food_drink", "other", "retail", "services"]
);
for (const mainCategory of Object.values(LocationMainCategory)) {
  assert.equal(parseCreateLocationInput({ ...locationBody, mainCategory }).mainCategory, mainCategory);
}
assert.throws(
  () => parseCreateLocationInput({ ...locationBody, mainCategory: undefined }),
  /Invalid mainCategory/
);
assert.throws(
  () => parseCreateLocationInput({ ...locationBody, mainCategory: "entertainment" }),
  /Invalid mainCategory/
);

assert.deepEqual(parseCreateLocationReviewInput({}), {
  paymentStatus: null,
  wallet: null,
  rating: null,
  text: null,
});
assert.throws(
  () => parseCreateLocationReviewInput({ text: "x".repeat(601) }),
  /text must not exceed 600 characters/
);

console.log("location contribution tests passed");
