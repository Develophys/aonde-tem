import { z } from "zod";

export const sendMagicCodeSchema = z.object({
  email: z.string().email(),
});
export type SendMagicCodeDto = z.infer<typeof sendMagicCodeSchema>;

export const verifyMagicCodeSchema = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
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

export const registrationTokenResponseSchema = z.object({
  registrationToken: z.string(),
  email: z.string().email(),
});
export type RegistrationTokenResponse = z.infer<typeof registrationTokenResponseSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const completeRegistrationSchema = z.object({
  registrationToken: z.string().min(1),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8),
});
export type CompleteRegistrationDto = z.infer<typeof completeRegistrationSchema>;
