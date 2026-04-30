import type { CreateLocationInput, CreateUserInput, Location, UserProfile } from "../domain/types.js";

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
}
