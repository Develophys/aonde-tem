import type { Discovery } from "../entities/discovery";
import type { Coordinates } from "../value-objects/coordinates";
import type { Price } from "../value-objects/price";

export interface NearbyDiscoveriesQuery {
  center: Coordinates;
  radiusMeters: number;
  itemQuery?: string;
  limit?: number;
  includeFresh?: boolean; // default true
}

/** Enriched row returned by findNearbyWithDetails and findByPlace — includes joined product/place names. */
export interface NearbyDiscoveryRow {
  id: string;
  productId: string;
  productName: string;
  placeId: string;
  placeName: string;
  priceBrl: number;
  quantity: number;
  note: string | null;
  /** Only populated by findByPlace (used to derive `isMine` server-side); absent from findNearbyWithDetails. */
  reporterId?: string;
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
  /** Returns all active (non-expired, non-hidden) discoveries for a place, newest first. */
  findByPlace(placeId: string): Promise<NearbyDiscoveryRow[]>;
  save(discovery: Discovery): Promise<void>;
  /** Updates the editable fields of an existing discovery and refreshes its TTL. */
  update(
    id: string,
    changes: { price: Price; quantity: number; note?: string; expiresAt: Date; createdAt: Date },
  ): Promise<void>;
  delete(id: string): Promise<void>;
}
