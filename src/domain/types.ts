export const allowedLocationCategories = ["grocery", "restaurant-bar", "other"] as const;

export type LocationCategory = (typeof allowedLocationCategories)[number];

export type UserProfile = {
  id: number;
  telegram_id: string;
  nickname: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
};

export type Location = {
  id: number;
  user_id: number | null;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  category: LocationCategory;
  website_url: string | null;
  image_url: string | null;
  schedules: string | null;
  is_approved: boolean;
  created_at: string;
};

export type CreateUserInput = {
  telegramId: string;
  nickname: string;
  avatarUrl: string | null;
};

export type CreateLocationInput = {
  telegramId: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  category: LocationCategory;
  websiteUrl: string | null;
  imageUrl: string | null;
  schedules: string | null;
};
