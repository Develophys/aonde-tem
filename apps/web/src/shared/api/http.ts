import { errorResponseSchema, type ErrorResponse } from "@aonde-tem/contracts";
import { useAppStore } from "@/app/store/index.js";

const BASE = import.meta.env.VITE_API_URL ?? "";
const TIMEOUT_MS = 15_000;

const GENERIC_ERROR: ErrorResponse = {
  error: { code: "unknown", message: "Algo deu errado. Tente novamente." },
};

const OFFLINE_ERROR: ErrorResponse = {
  error: { code: "network", message: "Sem conexão. Verifique sua internet e tente novamente." },
};

const TIMEOUT_ERROR: ErrorResponse = {
  error: { code: "timeout", message: "A conexão está lenta. Tente novamente." },
};

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
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError(0, TIMEOUT_ERROR);
    }
    // fetch throws (not a rejected response) on offline/DNS/CORS failures
    throw new ApiError(0, OFFLINE_ERROR);
  }

  const json: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    // The access token is now persisted across reloads (see app/store/index.ts), so a
    // stale/expired/rejected token is a real recurring case, not a rare one — clear the
    // session so ProtectedRoute redirects instead of leaving the user "authenticated"
    // with every request silently failing. A no-op if there's no session to begin with
    // (e.g. a wrong-password 401 on /api/auth/login).
    if (res.status === 401) useAppStore.getState().clearSession();

    const parsed = errorResponseSchema.safeParse(json);
    throw new ApiError(res.status, parsed.success ? parsed.data : GENERIC_ERROR);
  }
  return schema.parse(json);
}
