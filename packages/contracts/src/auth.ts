import { z } from "zod";

export const sendMagicCodeSchema = z.object({
  email: z.string().email(),
});
export type SendMagicCodeDto = z.infer<typeof sendMagicCodeSchema>;

export const verifyMagicCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
});
export type VerifyMagicCodeDto = z.infer<typeof verifyMagicCodeSchema>;

export const jwtResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    role: z.enum(["user", "admin"]),
  }),
});
export type JwtResponse = z.infer<typeof jwtResponseSchema>;
