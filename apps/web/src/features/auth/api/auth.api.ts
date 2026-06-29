import {
  jwtResponseSchema,
  type SendMagicCodeDto,
  type VerifyMagicCodeDto,
  type JwtResponse,
} from "@aonde-tem/contracts";
import { http } from "../../../shared/api/http.js";

export async function sendMagicCode(dto: SendMagicCodeDto): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(`send-code failed: ${res.status}`);
}

export async function verifyMagicCode(dto: VerifyMagicCodeDto): Promise<JwtResponse> {
  return http("/api/auth/verify-code", jwtResponseSchema, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
