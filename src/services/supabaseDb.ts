import { supabase } from "../lib/supabase.js";
import type {
  AdminLocationReport,
  CreateLocationInput,
  CreateLocationPhotoInput,
  CreateLocationReportInput,
  CreateLocationReviewInput,
  CreateUserInput,
  Location,
  LocationPhoto,
  LocationReport,
  LocationReview,
  UserProfile,
} from "../domain/types.js";
import type { DbService, LocationQuery } from "./db.js";
import { createDefaultNickname } from "../domain/userDefaults.js";

type UserRow = {
  id: number;
  telegram_id: string;
  nickname: string;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
};

type LocationRow = {
  id: number;
  created_by_user_id: number | null;
  btcmap_id?: number | null;
  osm_type?: string | null;
  osm_id?: number | string | null;
  name: string;
  description: string | null;
  lat: number;
  lon: number;
  category: string;
  addr_city?: string | null;
  addr_postcode?: string | null;
  addr_street?: string | null;
  addr_housenumber?: string | null;
  full_address?: string | null;
  phone?: string | null;
  website: string | null;
  image_url: string | null;
  opening_hours: string | null;
  bitcoin?: boolean | null;
  lightning?: boolean | null;
  raw_json?: unknown;
  is_approved: boolean;
  created_at: string;
};

type LocationPhotoRow = {
  id: number;
  location_id: number;
  user_id: number | null;
  image_url: string;
  caption: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type LocationReviewRow = {
  id: number;
  source: LocationReview["source"] | null;
  location_id: number;
  user_id: number | null;
  payment_status: LocationReview["payment_status"];
  wallet: LocationReview["wallet"];
  rating: number | null;
  text: string | null;
  created_at: string;
};

type LocationReportRow = {
  id: number;
  location_id: number;
  user_id: number | null;
  reasons: LocationReport["reasons"];
  text: string | null;
  created_at: string;
};

type AdminLocationReportRow = LocationReportRow & {
  places: { name: string } | { name: string }[];
};

const AUTO_APPROVE_LOCATIONS = process.env.AUTO_APPROVE_LOCATIONS !== "false";
const LOCATION_PHOTO_BUCKET = process.env.LOCATION_PHOTO_BUCKET ?? "location-photos";
const MAX_UPLOAD_BYTES = 1024 * 1024;
const LOCATION_SELECT = "id, created_by_user_id, btcmap_id, osm_type, osm_id, name, description, lat, lon, category, addr_city, addr_postcode, addr_street, addr_housenumber, full_address, phone, website, image_url, opening_hours, bitcoin, lightning, raw_json, is_approved, created_at";

type ErrorWithDetails = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

function toErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    const details = error as ErrorWithDetails;
    return {
      message: typeof details.message === "string" ? details.message : "Unknown error",
      code: typeof details.code === "string" ? details.code : undefined,
      details: typeof details.details === "string" ? details.details : undefined,
      hint: typeof details.hint === "string" ? details.hint : undefined,
    };
  }

  return {
    message: "Unknown error",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getRawTags(rawJson: unknown): Record<string, unknown> {
  return asRecord(asRecord(rawJson)?.tags) ?? {};
}

function tagIsYes(value: unknown): boolean | null {
  const normalized = asNonEmptyString(value)?.toLowerCase();
  if (!normalized) return null;
  if (["yes", "true", "1", "bitcoin", "lightning"].includes(normalized)) return true;
  if (["no", "false", "0"].includes(normalized)) return false;
  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = asNonEmptyString(value);
    if (text) return text;
  }
  return null;
}

function formatAddress(row: LocationRow, tags: Record<string, unknown>): string | null {
  const explicit = asNonEmptyString(row.full_address);
  if (explicit) return explicit;

  const houseNumber = firstString(row.addr_housenumber, tags["addr:housenumber"]);
  const street = firstString(row.addr_street, tags["addr:street"]);
  const postcode = firstString(row.addr_postcode, tags["addr:postcode"]);
  const city = firstString(row.addr_city, tags["addr:city"]);
  const line1 = [houseNumber, street].filter(Boolean).join(" ");
  const line2 = [postcode, city].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ") || null;
}

function mapUser(row: UserRow): UserProfile {
  const normalizedRole = typeof row.role === "string" ? row.role.trim().toLowerCase() : "user";
  return {
    id: row.id,
    telegram_id: row.telegram_id,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    role: normalizedRole.length > 0 ? normalizedRole : "user",
    created_at: row.created_at,
  };
}

function mapLocation(row: LocationRow): Location {
  const tags = getRawTags(row.raw_json);
  const bitcoinFromTags = tagIsYes(tags["currency:XBT"]) ?? tagIsYes(tags["payment:onchain"]);
  const lightningFromTags = tagIsYes(tags["payment:lightning"]) ?? tagIsYes(tags["payment:lightning_contactless"]);
  return {
    id: row.id,
    user_id: row.created_by_user_id,
    name: row.name,
    description: row.description,
    latitude: row.lat,
    longitude: row.lon,
    category: row.category as Location["category"],
    website_url: firstString(row.website, tags.website),
    phone: firstString(row.phone, tags.phone, tags["contact:phone"]),
    address: formatAddress(row, tags),
    image_url: row.image_url,
    schedules: firstString(row.opening_hours, tags.opening_hours),
    accepts_bitcoin: row.bitcoin ?? bitcoinFromTags,
    accepts_lightning: row.lightning ?? lightningFromTags,
    is_approved: row.is_approved,
    created_at: row.created_at,
  };
}

function mapLocationPhoto(row: LocationPhotoRow): LocationPhoto {
  return {
    id: row.id,
    location_id: row.location_id,
    user_id: row.user_id,
    image_url: row.image_url,
    caption: row.caption,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
  };
}

function mapLocationReview(row: LocationReviewRow): LocationReview {
  return {
    id: row.id,
    source: row.source ?? "app",
    location_id: row.location_id,
    user_id: row.user_id,
    payment_status: row.payment_status,
    wallet: row.wallet,
    rating: row.rating,
    text: row.text,
    created_at: row.created_at,
  };
}

function parseImageDataUrl(dataUrl: string): { bytes: Buffer; mimeType: string; extension: string } {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Unsupported image format. Use png, jpg, jpeg, webp, or gif.");
  }
  const rawMimeType = match[1];
  const base64 = match[2];
  if (!rawMimeType || !base64) {
    throw new Error("Invalid image data URL");
  }
  const mimeType = rawMimeType === "image/jpg" ? "image/jpeg" : rawMimeType;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error("Image must be 1MB or smaller.");
  }
  const parts = mimeType.split("/");
  const guessedExtension = parts[1];
  const extension = mimeType === "image/jpeg" ? "jpg" : guessedExtension ?? "png";
  return { bytes, mimeType, extension };
}

async function findUserByTelegramId(telegramId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, telegram_id, nickname, avatar_url, role, created_at")
    .eq("telegram_id", telegramId)
    .single<UserRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return mapUser(data);
}

function normalizeNickname(nickname: string | null): string | null {
  if (!nickname) {
    return null;
  }
  const trimmed = nickname.trim();
  return trimmed.length ? trimmed : null;
}

function mapLocationReport(row: LocationReportRow): LocationReport {
  return {
    id: row.id,
    location_id: row.location_id,
    user_id: row.user_id,
    reasons: row.reasons,
    text: row.text,
    created_at: row.created_at,
  };
}

function mapAdminLocationReport(row: AdminLocationReportRow): AdminLocationReport {
  const { user_id: _userId, ...report } = mapLocationReport(row);
  const place = Array.isArray(row.places) ? row.places[0] : row.places;
  return {
    ...report,
    location_name: place!.name,
  };
}

async function getRequiredUserByTelegramId(telegramId: string): Promise<UserProfile> {
  const user = await findUserByTelegramId(telegramId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

function isUniqueNicknameViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const withCode = error as { code?: unknown; message?: unknown };
  if (withCode.code !== "23505") {
    return false;
  }
  const message = typeof withCode.message === "string" ? withCode.message.toLowerCase() : "";
  return message.includes("nickname");
}

export class SupabaseDbService implements DbService {
  async getUserByTelegramId(telegramId: string): Promise<UserProfile | null> {
    return findUserByTelegramId(telegramId);
  }

  async createUser(input: CreateUserInput): Promise<UserProfile> {
    const normalizedNickname = normalizeNickname(input.nickname);
    const existing = await findUserByTelegramId(input.telegramId);
    if (existing) {
      throw new Error("User already exists");
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          telegram_id: input.telegramId,
          nickname:
            normalizedNickname ??
            createDefaultNickname({
              telegramId: input.telegramId,
              firstName: input.firstName,
              username: input.username,
            }),
          avatar_url: input.avatarUrl,
        },
      ])
      .select("id, telegram_id, nickname, avatar_url, role, created_at")
      .single<UserRow>();

    if (error) {
      if (isUniqueNicknameViolation(error)) {
        throw new Error("Nickname is already taken");
      }
      if (error.code === "23505") {
        const fetched = await findUserByTelegramId(input.telegramId);
        if (fetched) {
          throw new Error("User already exists");
        }
      }
      throw error;
    }

    return mapUser(data);
  }

  async updateUserProfile(input: CreateUserInput): Promise<UserProfile> {
    const existing = await getRequiredUserByTelegramId(input.telegramId);
    const normalizedNickname = normalizeNickname(input.nickname);
    const shouldUpdateNickname = normalizedNickname !== null && normalizedNickname !== existing.nickname;
    const shouldUpdateAvatar = input.avatarUrl !== undefined && input.avatarUrl !== existing.avatar_url;

    if (!shouldUpdateNickname && !shouldUpdateAvatar) {
      return existing;
    }

    const payload: { nickname?: string; avatar_url?: string | null } = {};
    if (shouldUpdateNickname) {
      payload.nickname = normalizedNickname;
    }
    if (shouldUpdateAvatar) {
      payload.avatar_url = input.avatarUrl;
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update(payload)
      .eq("telegram_id", input.telegramId)
      .select("id, telegram_id, nickname, avatar_url, role, created_at")
      .single<UserRow>();

    if (updateError) {
      if (isUniqueNicknameViolation(updateError)) {
        throw new Error("Nickname is already taken");
      }
      throw updateError;
    }

    return mapUser(updated);
  }

  async getOrCreateUser(input: CreateUserInput): Promise<UserProfile> {
    const existing = await findUserByTelegramId(input.telegramId);
    if (existing) {
      return this.updateUserProfile(input);
    }
    return this.createUser(input);
  }

  async listUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from("users")
      .select("id, telegram_id, nickname, avatar_url, role, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => mapUser(row as UserRow));
  }

  async updateUserRole(userId: number, role: "admin" | "user"): Promise<UserProfile> {
    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId)
      .select("id, telegram_id, nickname, avatar_url, role, created_at")
      .single<UserRow>();
    if (error) {
      throw error;
    }
    return mapUser(data);
  }

  async listApprovedLocations(query?: LocationQuery): Promise<Location[]> {
    return this.listLocationsByApproval(true, query);
  }

  async listAllLocations(query?: LocationQuery): Promise<Location[]> {
    return this.listLocationsByApproval(null, query);
  }

  private async listLocationsByApproval(
    isApproved: boolean | null,
    query?: LocationQuery
  ): Promise<Location[]> {
    if (query?.search) {
      return this.searchLocationsByApproval(isApproved, query);
    }

    let request = supabase
      .from("places")
      .select(LOCATION_SELECT);

    if (isApproved !== null) {
      request = request.eq("is_approved", isApproved);
    }

    if (query?.bbox) {
      request = request
        .gte("lat", query.bbox.minLat)
        .lte("lat", query.bbox.maxLat)
        .gte("lon", query.bbox.minLon)
        .lte("lon", query.bbox.maxLon);
    }

    request = request.order("created_at", { ascending: false });

    if (query?.limit && Number.isFinite(query.limit) && query.limit > 0) {
      request = request.limit(Math.min(query.limit, 200));
    }

    const { data, error } = await request;

    if (error) {
      console.error("[db:listLocationsByApproval] Supabase query failed", toErrorPayload(error));
      throw error;
    }

    return (data ?? []).map((row) => mapLocation(row as LocationRow));
  }

  private async searchLocationsByApproval(
    isApproved: boolean | null,
    query: LocationQuery
  ): Promise<Location[]> {
    const search = query.search?.trim();
    if (!search) {
      const { search: _search, ...queryWithoutSearch } = query;
      return this.listLocationsByApproval(isApproved, queryWithoutSearch);
    }

    const escaped = search.replace(/[\\%_]/g, "\\$&");
    const pattern = `%${escaped}%`;
    const limit = query.limit && Number.isFinite(query.limit) && query.limit > 0
      ? Math.min(query.limit, 200)
      : 200;

    const searchColumn = (column: "name" | "description" | "category") => {
      let request = supabase
        .from("places")
        .select(LOCATION_SELECT)
        .ilike(column, pattern);

      if (isApproved !== null) {
        request = request.eq("is_approved", isApproved);
      }

      if (query.bbox) {
        request = request
          .gte("lat", query.bbox.minLat)
          .lte("lat", query.bbox.maxLat)
          .gte("lon", query.bbox.minLon)
          .lte("lon", query.bbox.maxLon);
      }

      return request.order("created_at", { ascending: false }).limit(limit);
    };

    const results = await Promise.all([
      searchColumn("name"),
      searchColumn("description"),
      searchColumn("category"),
    ]);

    const rows = new Map<number, LocationRow>();
    for (const result of results) {
      if (result.error) {
        console.error("[db:searchLocationsByApproval] Supabase query failed", toErrorPayload(result.error));
        throw result.error;
      }
      for (const row of result.data ?? []) {
        const locationRow = row as LocationRow;
        rows.set(locationRow.id, locationRow);
      }
    }

    return [...rows.values()]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map(mapLocation);
  }

  async createLocation(input: CreateLocationInput): Promise<Location> {
    const user = await getRequiredUserByTelegramId(input.telegramId);

    const { data, error } = await supabase
      .from("places")
      .insert([
        {
          osm_type: "user",
          osm_id: Date.now(),
          created_by_user_id: user.id,
          name: input.name,
          description: input.description,
          lat: input.latitude,
          lon: input.longitude,
          category: input.category,
          website: input.websiteUrl,
          image_url: input.imageUrl,
          opening_hours: input.schedules,
          is_approved: AUTO_APPROVE_LOCATIONS,
          bitcoin: true,
        },
      ])
      .select(LOCATION_SELECT)
      .single<LocationRow>();

    if (error) {
      throw error;
    }

    return mapLocation(data);
  }

  async deleteLocationById(locationId: number): Promise<void> {
    const { error: reportsError } = await supabase
      .from("location_reports")
      .delete()
      .eq("location_id", locationId);
    if (reportsError) {
      throw reportsError;
    }
    const { error: reviewsError } = await supabase
      .from("location_reviews")
      .delete()
      .eq("location_id", locationId);
    if (reviewsError) {
      throw reviewsError;
    }

    const { error: photosError } = await supabase
      .from("location_photos")
      .delete()
      .eq("location_id", locationId);
    if (photosError) {
      throw photosError;
    }

    const { error: locationError } = await supabase
      .from("places")
      .delete()
      .eq("id", locationId);
    if (locationError) {
      throw locationError;
    }
  }

  async listLocationPhotos(locationId: number): Promise<LocationPhoto[]> {
    const { data, error } = await supabase
      .from("location_photos")
      .select("id, location_id, user_id, image_url, caption, mime_type, size_bytes, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => mapLocationPhoto(row as LocationPhotoRow));
  }

  async addLocationPhoto(input: CreateLocationPhotoInput): Promise<LocationPhoto> {
    const user = await getRequiredUserByTelegramId(input.telegramId);
    const parsed = parseImageDataUrl(input.dataUrl);
    const path = `${input.locationId}/${Date.now()}-${user.id}.${parsed.extension}`;
    const { error: uploadError } = await supabase.storage
      .from(LOCATION_PHOTO_BUCKET)
      .upload(path, parsed.bytes, {
        contentType: parsed.mimeType,
        upsert: false,
      });
    if (uploadError) {
      throw uploadError;
    }
    const { data: publicUrlData } = supabase.storage.from(LOCATION_PHOTO_BUCKET).getPublicUrl(path);
    const { data, error } = await supabase
      .from("location_photos")
      .insert([
        {
          location_id: input.locationId,
          user_id: user.id,
          image_url: publicUrlData.publicUrl,
          mime_type: parsed.mimeType,
          size_bytes: parsed.bytes.length,
        },
      ])
      .select("id, location_id, user_id, image_url, caption, mime_type, size_bytes, created_at")
      .single<LocationPhotoRow>();
    if (error) {
      throw error;
    }
    return mapLocationPhoto(data);
  }

  async listLocationReviews(locationId: number): Promise<LocationReview[]> {
    const { data, error } = await supabase
      .from("location_reviews")
      .select("id, source, location_id, user_id, payment_status, wallet, rating, text, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => mapLocationReview(row as LocationReviewRow));
  }

  async addLocationReview(input: CreateLocationReviewInput): Promise<LocationReview> {
    const user = await getRequiredUserByTelegramId(input.telegramId);
    const text = input.text?.trim();
    if (!text) {
      throw new Error("Comment text is required");
    }
    const { data, error } = await supabase
      .from("location_reviews")
      .insert([
        {
          source: "app",
          location_id: input.locationId,
          user_id: user.id,
          payment_status: input.paymentStatus,
          wallet: input.wallet,
          rating: input.rating,
          text,
        },
      ])
      .select("id, source, location_id, user_id, payment_status, wallet, rating, text, created_at")
      .single<LocationReviewRow>();
    if (error) {
      throw error;
    }
    return mapLocationReview(data);
  }

  async addLocationReport(input: CreateLocationReportInput): Promise<LocationReport> {
    const user = await getRequiredUserByTelegramId(input.telegramId);
    const { data, error } = await supabase
      .from("location_reports")
      .insert([
        {
          location_id: input.locationId,
          user_id: user.id,
          reasons: input.reasons,
          text: input.text,
        },
      ])
      .select("id, location_id, user_id, reasons, text, created_at")
      .single<LocationReportRow>();
    if (error) {
      throw error;
    }
    return mapLocationReport(data);
  }

  async listLocationReports(): Promise<AdminLocationReport[]> {
    const { data, error } = await supabase
      .from("location_reports")
      .select("id, location_id, user_id, reasons, text, created_at, places!inner(name)")
      .order("created_at", { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => mapAdminLocationReport(row as AdminLocationReportRow));
  }

  async deleteLocationReviewById(reviewId: number): Promise<void> {
    const { error } = await supabase
      .from("location_reviews")
      .delete()
      .eq("id", reviewId);
    if (error) {
      throw error;
    }
  }
}
