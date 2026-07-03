import { errorResponseSchema, type ErrorResponse } from "@aonde-tem/contracts";

const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ErrorResponse,
  ) {
    super(body.error.message);
  }
}

export async function http<T>(
  path: string,
  schema: { parse: (d: unknown) => T },
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, errorResponseSchema.parse(json));
  return schema.parse(json);
}
