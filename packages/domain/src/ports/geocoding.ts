import { Coordinates } from "../value-objects/coordinates.js";

export interface GeocodeResult {
  label: string;
  coords: Coordinates;
}

/** Port: address <-> coordinates. Implemented by a provider adapter (LocationIQ/Nominatim). */
export interface GeocodingService {
  search(query: string): Promise<GeocodeResult[]>;
  reverse(coords: Coordinates): Promise<string | null>;
}
