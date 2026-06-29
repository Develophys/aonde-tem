import { z } from "zod";

export const createFlagSchema = z.object({
  targetType: z.enum(["product", "discovery"]),
  targetId: z.string().uuid(),
  reason: z.enum(["illegal", "inappropriate", "spam", "wrong_info", "other"]),
  comment: z.string().max(500).optional(),
});
export type CreateFlagDto = z.infer<typeof createFlagSchema>;

export const flagResponseSchema = z.object({
  id: z.string().uuid(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
});
export type FlagResponse = z.infer<typeof flagResponseSchema>;

export const adminFlagResponseSchema = flagResponseSchema.extend({
  reporterEmail: z.string().email(),
  comment: z.string().nullable(),
});
export type AdminFlagResponse = z.infer<typeof adminFlagResponseSchema>;

export const adminActionSchema = z.object({
  action: z.enum(["hide", "dismiss"]),
});
export type AdminActionDto = z.infer<typeof adminActionSchema>;
