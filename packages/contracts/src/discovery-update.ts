import { z } from "zod";

export const updateDiscoverySchema = z.object({
  priceBrl: z.number().positive().max(99_999.99),
  quantity: z.number().int().min(1),
  note: z.string().max(500).optional(),
});
export type UpdateDiscoveryDto = z.infer<typeof updateDiscoverySchema>;

export const updateDiscoveryResponseSchema = z.object({
  id: z.string().uuid(),
  priceBrl: z.number(),
  quantity: z.number().int(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type UpdateDiscoveryResponse = z.infer<typeof updateDiscoveryResponseSchema>;
