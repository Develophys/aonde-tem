import type { Discovery } from "../entities/discovery";
import type { Coordinates } from "../value-objects/coordinates";

export interface NearbyDiscoveriesQuery {
  center: Coordinates;
  radiusMeters: number;
  itemQuery?: string;
  limit?: number;
  includeFresh?: boolean; // default true
}

export interface DiscoveryRepository {
  findById(id: string): Promise<Discovery | null>;
  findNearby(query: NearbyDiscoveriesQuery): Promise<Discovery[]>;
  save(discovery: Discovery): Promise<void>;
  delete(id: string): Promise<void>;
}
