import { z } from "zod";

/**
 * A discovery as it appears in the reporter's own profile.
 *
 * Deliberately NOT `discoveryResponseSchema`: that one carries `distanceMeters`,
 * which only exists relative to a search centre. The profile has no centre — it
 * lists what one person reported, wherever they were. It carries `isExpired`
 * instead, computed server-side so the client never has to reason about clock skew.
 */
export const myDiscoverySchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  placeId: z.string().uuid(),
  placeName: z.string(),
  priceBrl: z.number(),
  quantity: z.number().int(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  isExpired: z.boolean(),
});

export type MyDiscovery = z.infer<typeof myDiscoverySchema>;

/**
 * `memberSince` lives here rather than in the JWT because the session payload
 * carries only id/email/displayName/role — the profile header's "Reportando desde
 * <mês/ano>" has no other source.
 *
 * `active` counts non-expired reports. The mockup's second stat column was
 * "% confirmados", which has no data behind it: there is no confirmation,
 * vote, or re-sighting entity in the schema. Reporting a number we cannot
 * compute would be inventing trust signals, so this counts what is real.
 */
export const myDiscoveriesResponseSchema = z.object({
  results: z.array(myDiscoverySchema),
  stats: z.object({
    total: z.number().int(),
    active: z.number().int(),
    memberSince: z.string().datetime(),
  }),
});

export type MyDiscoveriesResponse = z.infer<typeof myDiscoveriesResponseSchema>;
