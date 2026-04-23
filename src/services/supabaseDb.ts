import { supabase } from "../lib/supabase.js";
import type {
  CreateLocationInput,
  CreateUserInput,
  Location,
  UserProfile,
} from "../domain/types.js";
import type { DbService } from "./db.js";

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
  name: string;
  description: string | null;
  lat: number;
  lon: number;
  category: string;
  website: string | null;
  image_url: string | null;
  opening_hours: string | null;
  is_approved: boolean;
  created_at: string;
};

const AUTO_APPROVE_LOCATIONS = process.env.AUTO_APPROVE_LOCATIONS !== "false";

function mapUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    telegram_id: row.telegram_id,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    role: row.role ?? "user",
    created_at: row.created_at,
  };
}

function mapLocation(row: LocationRow): Location {
  return {
    id: row.id,
    user_id: row.created_by_user_id,
    name: row.name,
    description: row.description,
    latitude: row.lat,
    longitude: row.lon,
    category: row.category as Location["category"],
    website_url: row.website,
    image_url: row.image_url,
    schedules: row.opening_hours,
    is_approved: row.is_approved,
    created_at: row.created_at,
  };
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

export class SupabaseDbService implements DbService {
  async getOrCreateUser(input: CreateUserInput): Promise<UserProfile> {
    const existing = await findUserByTelegramId(input.telegramId);
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          telegram_id: input.telegramId,
          nickname: input.nickname,
          avatar_url: input.avatarUrl,
        },
      ])
      .select("id, telegram_id, nickname, avatar_url, role, created_at")
      .single<UserRow>();

    if (error) {
      if (error.code === "23505") {
        const fetched = await findUserByTelegramId(input.telegramId);
        if (fetched) {
          return fetched;
        }
      }
      throw error;
    }

    return mapUser(data);
  }

  async listApprovedLocations(): Promise<Location[]> {
    const { data, error } = await supabase
      .from("places")
      .select(
        "id, created_by_user_id, name, description, lat, lon, category, website, image_url, opening_hours, is_approved, created_at"
      )
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => mapLocation(row as LocationRow));
  }

  async createLocation(input: CreateLocationInput): Promise<Location> {
    const user = await this.getOrCreateUser({
      telegramId: input.telegramId,
      nickname: `user_${input.telegramId}`,
      avatarUrl: null,
    });

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
      .select(
        "id, created_by_user_id, name, description, lat, lon, category, website, image_url, opening_hours, is_approved, created_at"
      )
      .single<LocationRow>();

    if (error) {
      throw error;
    }

    return mapLocation(data);
  }
}
