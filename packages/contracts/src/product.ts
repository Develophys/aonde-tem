import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  normalizedKey: z.string(),
  status: z.enum(["active", "under_review", "blocked"]),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ProductResponse = z.infer<typeof productResponseSchema>;
