import { z } from "zod";

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createPlaceSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  address: z.string().optional(),
  coords: coordinatesSchema,
});
export type CreatePlaceDto = z.infer<typeof createPlaceSchema>;

export const placeResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  address: z.string().optional(),
  coords: coordinatesSchema,
});
export type PlaceResponse = z.infer<typeof placeResponseSchema>;

export const placeListSchema = z.array(placeResponseSchema);

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(50_000).default(2000), // metres
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
