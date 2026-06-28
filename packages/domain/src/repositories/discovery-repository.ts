import type { Discovery } from "../entities/discovery";
import type { Coordinates } from "../value-objects/coordinates";

export interface NearbyDiscoveriesQuery {
  center: Coordinates;
  radiusMeters: number;
  itemQuery?: string;
  limit?: number;
  includeFresh?: boolean; // default true
}

/** Enriched row returned by findNearbyWithDetails — includes joined product/place names and distance. */
export interface NearbyDiscoveryRow {
  id: string;
  productId: string;
  productName: string;
  placeId: string;
  placeName: string;
  priceBrl: number;
  quantity: number;
  note: string | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface DiscoveryRepository {
  findById(id: string): Promise<Discovery | null>;
  findNearby(query: NearbyDiscoveriesQuery): Promise<Discovery[]>;
  findNearbyWithDetails(query: NearbyDiscoveriesQuery): Promise<NearbyDiscoveryRow[]>;
  save(discovery: Discovery): Promise<void>;
  delete(id: string): Promise<void>;
}
