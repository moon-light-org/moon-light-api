import {
  allowedLocationCategories,
  type CreateLocationInput,
  type CreateUserInput,
  type LocationCategory,
} from "./types.js";

export type CreateUserBodyInput = Omit<CreateUserInput, "telegramId" | "avatarUrl"> & {
  avatarUrl?: string | null;
};
export type CreateLocationBodyInput = Omit<CreateLocationInput, "telegramId">;
export type CreateLocationPhotoBodyInput = { dataUrl: string };
export type CreateLocationReviewBodyInput = { rating: number; text: string | null };

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalTrimmedString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed.length ? trimmed : null;
}

function ensureLatitude(value: unknown): number {
  const latitude = Number(value);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Invalid latitude: expected a value between -90 and 90");
  }
  return latitude;
}

function ensureLongitude(value: unknown): number {
  const longitude = Number(value);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Invalid longitude: expected a value between -180 and 180");
  }
  return longitude;
}

function ensureCategory(value: unknown): LocationCategory {
  const category = asTrimmedString(value);
  if (!(allowedLocationCategories as readonly string[]).includes(category)) {
    throw new Error(
      `Invalid category: expected one of ${allowedLocationCategories.join(", ")}`
    );
  }
  return category as LocationCategory;
}

function ensureLocationName(value: unknown): string {
  const name = asTrimmedString(value);
  if (!name.length) {
    throw new Error("name is required");
  }
  if (name.length > 120) {
    throw new Error("name must not exceed 120 characters");
  }
  return name;
}

export function parseCreateUserInput(raw: unknown): CreateUserBodyInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be an object");
  }

  const source = raw as Record<string, unknown>;
  const nickname = optionalTrimmedString(source.nickname);
  const avatarUrl = Object.prototype.hasOwnProperty.call(source, "avatarUrl")
    ? optionalTrimmedString(source.avatarUrl)
    : undefined;

  return avatarUrl === undefined ? { nickname } : { nickname, avatarUrl };
}

export function parseCreateLocationInput(raw: unknown): CreateLocationBodyInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be an object");
  }

  const source = raw as Record<string, unknown>;

  return {
    name: ensureLocationName(source.name),
    description: optionalTrimmedString(source.description),
    latitude: ensureLatitude(source.latitude),
    longitude: ensureLongitude(source.longitude),
    category: ensureCategory(source.category),
    websiteUrl: optionalTrimmedString(source.websiteUrl),
    imageUrl: optionalTrimmedString(source.imageUrl),
    schedules: optionalTrimmedString(source.schedules),
  };
}

export function parseCreateLocationPhotoInput(raw: unknown): CreateLocationPhotoBodyInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be an object");
  }
  const source = raw as Record<string, unknown>;
  const dataUrl = asTrimmedString(source.dataUrl);
  if (!dataUrl) {
    throw new Error("dataUrl is required");
  }
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Only image data URLs are supported");
  }
  return { dataUrl };
}

export function parseCreateLocationReviewInput(raw: unknown): CreateLocationReviewBodyInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be an object");
  }
  const source = raw as Record<string, unknown>;
  const rating = Number(source.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("rating must be an integer from 1 to 5");
  }
  const text = optionalTrimmedString(source.text);
  if (text && text.length > 600) {
    throw new Error("text must not exceed 600 characters");
  }
  return { rating, text };
}

export { allowedLocationCategories };
