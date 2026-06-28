import { z } from "zod";

export const nearbyDiscoveriesQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50_000).default(5_000), // metres
  item: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().min(1).max(50).default(50),
});

export type NearbyDiscoveriesQuery = z.infer<typeof nearbyDiscoveriesQuerySchema>;

export const discoveryResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  placeId: z.string().uuid(),
  placeName: z.string(),
  priceBrl: z.number(),        // in BRL (e.g. 9.99)
  quantity: z.number().int(),
  note: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  distanceMeters: z.number(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  ageMinutes: z.number().int(),
});

export type DiscoveryResponse = z.infer<typeof discoveryResponseSchema>;

export const nearbyDiscoveriesResponseSchema = z.object({
  results: z.array(discoveryResponseSchema),
  total: z.number().int(),
});

export type NearbyDiscoveriesResponse = z.infer<typeof nearbyDiscoveriesResponseSchema>;
