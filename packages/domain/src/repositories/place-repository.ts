import { Place } from "../entities/place.js";
import { Coordinates } from "../value-objects/coordinates.js";

/** Port: persistence boundary for places. Implemented in infrastructure (PostGIS). */
export interface PlaceRepository {
  findById(id: string): Promise<Place | null>;
  findNearby(center: Coordinates, radiusMeters: number): Promise<Place[]>;
  save(place: Place): Promise<void>;
}
