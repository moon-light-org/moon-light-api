import assert from "node:assert/strict";
import { CheckInError, checkInEligibility, parseCheckInPosition } from "../dist/domain/checkIn.js";

const place = { latitude: 51.5, longitude: -0.1 };
const position = { ...place, accuracyMeters: 8 };

assert.deepEqual(parseCheckInPosition(position), position);
assert.equal(checkInEligibility(position, place), "eligible");
assert.equal(checkInEligibility({ ...position, accuracyMeters: null }, place), "uncertain");
assert.equal(checkInEligibility({ ...position, accuracyMeters: 51 }, place), "uncertain");
assert.equal(checkInEligibility({ ...position, latitude: 51.5008, accuracyMeters: 20 }, place), "uncertain");
assert.equal(checkInEligibility({ ...position, latitude: 51.502 }, place), "out_of_range");
assert.throws(() => parseCheckInPosition({ ...position, accuracyMeters: undefined }), CheckInError);
assert.throws(() => parseCheckInPosition({ ...position, latitude: 91 }), CheckInError);

console.log("check-in policy tests passed");
