import {
  jwtResponseSchema,
  registrationTokenResponseSchema,
  type SendMagicCodeDto,
  type VerifyMagicCodeDto,
  type JwtResponse,
  type RegistrationTokenResponse,
  type LoginDto,
  type CompleteRegistrationDto,
} from "@aonde-tem/contracts";
import { http } from "@/shared/api/http.js";

export async function sendMagicCode(dto: SendMagicCodeDto): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(`send-code failed: ${res.status}`);
}

export async function verifyMagicCode(
  dto: VerifyMagicCodeDto,
): Promise<JwtResponse | RegistrationTokenResponse> {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(`verify-code failed: ${res.status}`);
  const json = await res.json();
  const jwt = jwtResponseSchema.safeParse(json);
  if (jwt.success) return jwt.data;
  return registrationTokenResponseSchema.parse(json);
}

export async function loginWithPassword(dto: LoginDto): Promise<JwtResponse> {
  return http("/api/auth/login", jwtResponseSchema, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function completeRegistration(dto: CompleteRegistrationDto): Promise<JwtResponse> {
  return http("/api/auth/complete-registration", jwtResponseSchema, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
