import {
  allowedLocationCategories,
  type CreateLocationInput,
  type CreateUserInput,
  type LocationCategory,
} from "./types.js";

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

function ensureTelegramId(value: unknown): string {
  const telegramId = asTrimmedString(value);
  if (!telegramId.length) {
    throw new Error("telegramId is required");
  }
  return telegramId;
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

export function parseCreateUserInput(raw: unknown): CreateUserInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be an object");
  }

  const source = raw as Record<string, unknown>;
  const telegramId = ensureTelegramId(source.telegramId);
  const nickname = optionalTrimmedString(source.nickname) ?? `user_${telegramId}`;
  const avatarUrl = optionalTrimmedString(source.avatarUrl);

  return { telegramId, nickname, avatarUrl };
}

export function parseCreateLocationInput(raw: unknown): CreateLocationInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be an object");
  }

  const source = raw as Record<string, unknown>;

  return {
    telegramId: ensureTelegramId(source.telegramId),
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

export { allowedLocationCategories };
