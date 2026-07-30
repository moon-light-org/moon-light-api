import {
  allowedLocationCategories,
  locationPaymentStatuses,
  locationReportReasons,
  locationWallets,
  type CreateLocationInput,
  type LocationCategory,
} from "./types.js";

export type CreateUserBodyInput = {
  nickname: string | null;
  avatarUrl?: string | null;
};
export type CreateLocationBodyInput = Omit<CreateLocationInput, "telegramId">;
export type CreateLocationPhotoBodyInput = { dataUrl: string };
export type CreateLocationReviewBodyInput = {
  paymentStatus: (typeof locationPaymentStatuses)[number] | null;
  wallet: (typeof locationWallets)[number] | null;
  rating: number | null;
  text: string | null;
};
export type CreateLocationReportBodyInput = {
  reasons: (typeof locationReportReasons)[number][];
  text: string | null;
};

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
  if (nickname && (nickname.length < 2 || nickname.length > 32)) {
    throw new Error("nickname must be between 2 and 32 characters");
  }
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
  const paymentStatus = asTrimmedString(source.paymentStatus);
  if (paymentStatus && !(locationPaymentStatuses as readonly string[]).includes(paymentStatus)) {
    throw new Error(`Invalid paymentStatus: expected one of ${locationPaymentStatuses.join(", ")}`);
  }
  const walletValue = asTrimmedString(source.wallet);
  if (walletValue && !(locationWallets as readonly string[]).includes(walletValue)) {
    throw new Error(`Invalid wallet: expected one of ${locationWallets.join(", ")}`);
  }
  const ratingValue = source.rating;
  const rating = ratingValue === undefined || ratingValue === null || ratingValue === "" ? null : Number(ratingValue);
  if (rating !== null && (!Number.isInteger(rating) || rating < 0 || rating > 3)) {
    throw new Error("rating must be an integer from 0 to 3");
  }
  const text = optionalTrimmedString(source.text);
  if (text && text.length > 600) {
    throw new Error("text must not exceed 600 characters");
  }
  return {
    paymentStatus: paymentStatus ? paymentStatus as CreateLocationReviewBodyInput["paymentStatus"] : null,
    wallet: walletValue ? (walletValue as CreateLocationReviewBodyInput["wallet"]) : null,
    rating,
    text,
  };
}

export function parseCreateLocationReportInput(raw: unknown): CreateLocationReportBodyInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be an object");
  }
  const source = raw as Record<string, unknown>;
  if (!Array.isArray(source.reasons) || source.reasons.length === 0) {
    throw new Error("reasons must contain at least one reason");
  }
  const reasons = source.reasons.map((value) => {
    const reason = asTrimmedString(value);
    if (!(locationReportReasons as readonly string[]).includes(reason)) {
      throw new Error(`Invalid report reason: expected one of ${locationReportReasons.join(", ")}`);
    }
    return reason as CreateLocationReportBodyInput["reasons"][number];
  });
  if (new Set(reasons).size !== reasons.length) {
    throw new Error("reasons must not contain duplicates");
  }
  const text = optionalTrimmedString(source.text);
  if (text && text.length > 600) {
    throw new Error("text must not exceed 600 characters");
  }
  return { reasons, text };
}

export { allowedLocationCategories };
