import { ForbiddenException } from "@nestjs/common";
import { AdminGuard } from "./admin.guard.js";
import type { JwtService } from "@nestjs/jwt";
import type { ExecutionContext } from "@nestjs/common";

function makeContext(headers: Record<string, string>) {
  const req: { headers: Record<string, string>; user?: unknown } = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe("AdminGuard", () => {
  it("rejects a user-role token with 403", () => {
    const payload = { sub: "u1", email: "a@b.com", role: "user" };
    const jwt = { verify: jest.fn().mockReturnValue(payload) } as unknown as JwtService;
    const guard = new AdminGuard(jwt);
    const { context } = makeContext({ authorization: "Bearer user-token" });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("allows an admin-role token and populates req.user", () => {
    const payload = { sub: "u1", email: "admin@b.com", role: "admin" };
    const jwt = { verify: jest.fn().mockReturnValue(payload) } as unknown as JwtService;
    const guard = new AdminGuard(jwt);
    const { context, req } = makeContext({ authorization: "Bearer admin-token" });

    expect(guard.canActivate(context)).toBe(true);
    expect(req.user).toEqual(payload);
  });

  it("rejects a missing Authorization header with 403", () => {
    const jwt = { verify: jest.fn() } as unknown as JwtService;
    const guard = new AdminGuard(jwt);
    const { context } = makeContext({});

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it("rejects a malformed Authorization header with 403", () => {
    const jwt = { verify: jest.fn() } as unknown as JwtService;
    const guard = new AdminGuard(jwt);
    const { context } = makeContext({ authorization: "not-a-bearer-token" });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it("rejects an invalid/expired token with 403", () => {
    const jwt = {
      verify: jest.fn(() => {
        throw new Error("invalid");
      }),
    } as unknown as JwtService;
    const guard = new AdminGuard(jwt);
    const { context } = makeContext({ authorization: "Bearer bad-token" });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
