import type { CreateLocationInput, CreateUserInput, Location, UserProfile } from "../domain/types.js";

export interface DbService {
  getOrCreateUser(input: CreateUserInput): Promise<UserProfile>;
  listApprovedLocations(): Promise<Location[]>;
  createLocation(input: CreateLocationInput): Promise<Location>;
}
