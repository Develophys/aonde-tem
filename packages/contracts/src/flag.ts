import { z } from "zod";

export const flagTargetTypeSchema = z.enum(["product", "discovery"]);
export type FlagTargetTypeDto = z.infer<typeof flagTargetTypeSchema>;

export const flagReasonSchema = z.enum(["illegal", "inappropriate", "spam", "wrong_info", "other"]);
export type FlagReasonDto = z.infer<typeof flagReasonSchema>;

export const createFlagSchema = z.object({
  targetType: flagTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: flagReasonSchema,
  comment: z.string().max(500).optional(),
});
export type CreateFlagDto = z.infer<typeof createFlagSchema>;

export const flagResponseSchema = z.object({
  id: z.string().uuid(),
  targetType: flagTargetTypeSchema,
  targetId: z.string(),
  reason: flagReasonSchema,
  status: z.string(),
  createdAt: z.string().datetime(),
});
export type FlagResponse = z.infer<typeof flagResponseSchema>;

/** One flagged target in the admin queue — every open flag on it, collapsed. */
export const adminQueueItemSchema = z.object({
  targetType: flagTargetTypeSchema,
  targetId: z.string().uuid(),
  /** Null when the flagged content no longer exists; the card says "Conteúdo removido". */
  targetName: z.string().nullable(),
  /** "Mercadinho do Zé · R$ 24,90" for a discovery; null for a product. */
  targetContext: z.string().nullable(),
  flagCount: z.number().int().positive(),
  // `.min(1)` rather than `.nonempty()`: the latter types the field as the tuple
  // `[FlagReasonDto, ...FlagReasonDto[]]`, which a plain `FlagReason[]` from the
  // domain cannot be assigned to. Both validate the same thing.
  reasons: z.array(flagReasonSchema).min(1),
  latestComment: z.string().nullable(),
  latestReporterEmail: z.string().email(),
  latestAt: z.string().datetime(),
});
export type AdminQueueItem = z.infer<typeof adminQueueItemSchema>;

export const adminQueueResponseSchema = z.object({ items: z.array(adminQueueItemSchema) });
export type AdminQueueResponse = z.infer<typeof adminQueueResponseSchema>;

export const adminActionSchema = z.object({
  action: z.enum(["hide", "dismiss"]),
});
export type AdminActionDto = z.infer<typeof adminActionSchema>;
