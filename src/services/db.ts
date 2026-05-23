import type {
  CreateLocationInput,
  CreateLocationPhotoInput,
  CreateLocationReviewInput,
  CreateUserInput,
  Location,
  LocationPhoto,
  LocationReview,
  UserProfile,
} from "../domain/types.js";

export type LocationQuery = {
  bbox?: {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
  };
  search?: string;
  limit?: number;
};

export interface DbService {
  getOrCreateUser(input: CreateUserInput): Promise<UserProfile>;
  listApprovedLocations(query?: LocationQuery): Promise<Location[]>;
  createLocation(input: CreateLocationInput): Promise<Location>;
  listLocationPhotos(locationId: number): Promise<LocationPhoto[]>;
  addLocationPhoto(input: CreateLocationPhotoInput): Promise<LocationPhoto>;
  listLocationReviews(locationId: number): Promise<LocationReview[]>;
  addLocationReview(input: CreateLocationReviewInput): Promise<LocationReview>;
}
