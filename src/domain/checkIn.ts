export type CheckInPosition = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
};

export type LocationCheckIn = {
  id: number;
  checkedInAt: string;
  nextEligibleAt: string;
};

export class CheckInError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function parseCheckInPosition(raw: unknown): CheckInPosition {
  if (!raw || typeof raw !== "object") throw new CheckInError("Request body must be an object.", 400);
  const value = raw as Record<string, unknown>;
  const { latitude, longitude, accuracyMeters } = value;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      (accuracyMeters !== null && (typeof accuracyMeters !== "number" || !Number.isFinite(accuracyMeters) || accuracyMeters < 0))) {
    throw new CheckInError("Invalid check-in position or accuracy.", 400);
  }
  return { latitude, longitude, accuracyMeters: accuracyMeters as number | null };
}

export function checkInEligibility(position: CheckInPosition, place: { latitude: number; longitude: number }) {
  if (position.accuracyMeters === null || position.accuracyMeters > 50) return "uncertain";
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(place.latitude - position.latitude);
  const dLon = radians(place.longitude - position.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(position.latitude)) *
    Math.cos(radians(place.latitude)) * Math.sin(dLon / 2) ** 2;
  const distanceMeters = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (distanceMeters > 100) return "out_of_range";
  return distanceMeters + position.accuracyMeters > 100 ? "uncertain" : "eligible";
}
