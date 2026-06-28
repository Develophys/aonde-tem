import { z } from "zod";

export const createDiscoverySchema = z.object({
  productId: z.string().uuid().optional(),
  productName: z.string().min(1).max(200).optional(), // use existing or create
  placeId: z.string().uuid().optional(),
  placeName: z.string().min(2).max(200),              // always required for new places
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  priceBrl: z.number().positive().max(99_999.99),
  quantity: z.number().int().min(1),
  note: z.string().max(500).optional(),
}).refine((d) => d.productId || d.productName, {
  message: "Either productId or productName must be provided",
});
export type CreateDiscoveryDto = z.infer<typeof createDiscoverySchema>;

export const createDiscoveryResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  placeId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type CreateDiscoveryResponse = z.infer<typeof createDiscoveryResponseSchema>;
