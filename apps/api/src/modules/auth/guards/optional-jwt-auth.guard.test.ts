import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard.js";
import type { JwtService } from "@nestjs/jwt";
import type { ExecutionContext } from "@nestjs/common";

function makeContext(headers: Record<string, string>) {
  const req: { headers: Record<string, string>; user?: unknown } = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe("OptionalJwtAuthGuard", () => {
  it("allows requests with no Authorization header and leaves user undefined", () => {
    const jwt = { verify: jest.fn() } as unknown as JwtService;
    const guard = new OptionalJwtAuthGuard(jwt);
    const { context, req } = makeContext({});

    expect(guard.canActivate(context)).toBe(true);
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it("sets req.user from a valid Bearer token", () => {
    const payload = { sub: "u1", email: "a@b.com", role: "user" };
    const jwt = { verify: jest.fn().mockReturnValue(payload) } as unknown as JwtService;
    const guard = new OptionalJwtAuthGuard(jwt);
    const { context, req } = makeContext({ authorization: "Bearer good-token" });

    expect(guard.canActivate(context)).toBe(true);
    expect(req.user).toEqual(payload);
  });

  it("allows an invalid Bearer token through anonymously", () => {
    const jwt = {
      verify: jest.fn(() => {
        throw new Error("invalid");
      }),
    } as unknown as JwtService;
    const guard = new OptionalJwtAuthGuard(jwt);
    const { context, req } = makeContext({ authorization: "Bearer bad-token" });

    expect(guard.canActivate(context)).toBe(true);
    expect(req.user).toBeUndefined();
  });
});
