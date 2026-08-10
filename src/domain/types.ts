export const allowedLocationCategories = ["grocery", "restaurant-bar", "other"] as const;
export const locationPaymentStatuses = ["lightning", "btc_only", "neither"] as const;
export const locationWallets = ["wallet_of_satoshi", "muun", "breez", "blw", "eclair", "zap", "phoenix", "blue_wallet", "other"] as const;
export const locationReportReasons = ["missing", "no_lightning_or_btc", "illegal_service", "poor_service", "other"] as const;

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
  firstName: string;
  username: string | null;
  nickname: string | null;
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

export type LocationPhoto = {
  id: number;
  location_id: number;
  user_id: number | null;
  image_url: string;
  caption: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type LocationReview = {
  id: number;
  source: "app" | "btcmap";
  location_id: number;
  user_id: number | null;
  payment_status: (typeof locationPaymentStatuses)[number] | null;
  wallet: (typeof locationWallets)[number] | null;
  rating: number | null;
  text: string | null;
  created_at: string;
};

export type LocationReport = {
  id: number;
  location_id: number;
  user_id: number | null;
  reasons: (typeof locationReportReasons)[number][];
  text: string | null;
  created_at: string;
};

export type AdminLocationReport = Omit<LocationReport, "user_id"> & {
  location_name: string;
};

export type CreateLocationPhotoInput = {
  telegramId: string;
  locationId: number;
  dataUrl: string;
};

export type CreateLocationReviewInput = {
  telegramId: string;
  locationId: number;
  paymentStatus: (typeof locationPaymentStatuses)[number] | null;
  wallet: (typeof locationWallets)[number] | null;
  rating: number | null;
  text: string | null;
};

export type CreateLocationReportInput = {
  telegramId: string;
  locationId: number;
  reasons: (typeof locationReportReasons)[number][];
  text: string | null;
};
