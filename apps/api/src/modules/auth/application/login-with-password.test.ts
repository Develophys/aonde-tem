// apps/api/src/modules/auth/application/login-with-password.test.ts
import { LoginWithPassword } from "./login-with-password.js";
import { UnauthorizedError } from "@aonde-tem/domain";
import { User } from "@aonde-tem/domain";
import type { UserRepository } from "@aonde-tem/domain";
import type { HashService } from "./hash.service.js";
import type { Logger } from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => nullLog,
};

function makeUser(overrides: Partial<Parameters<typeof User.create>[0]> = {}): User {
  return User.create({
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "user@example.com",
    role: "user",
    passwordHash: "$2b$12$hash",
    ...overrides,
  });
}

function makeRepo(user: User | null): UserRepository {
  return {
    findById: async () => null,
    findByEmail: async () => user,
    findByGoogleId: async () => null,
    save: async () => {},
    updateCredentials: async () => {},
    linkGoogleId: async () => {},
  };
}

function makeHash(valid: boolean): HashService {
  return {
    hash: async (p) => p,
    compare: async () => valid,
  };
}

describe("LoginWithPassword", () => {
  it("returns user on valid credentials", async () => {
    const user = makeUser();
    const uc = new LoginWithPassword(makeRepo(user), makeHash(true), nullLog);
    const result = await uc.execute("user@example.com", "secret");
    expect(result.id).toBe(user.id);
  });

  it("throws UnauthorizedError when user not found", async () => {
    const uc = new LoginWithPassword(makeRepo(null), makeHash(true), nullLog);
    await expect(uc.execute("x@x.com", "secret")).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when user has no password (Google-only account)", async () => {
    const user = makeUser({ passwordHash: null });
    const uc = new LoginWithPassword(makeRepo(user), makeHash(true), nullLog);
    await expect(uc.execute("user@example.com", "secret")).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError on wrong password", async () => {
    const user = makeUser();
    const uc = new LoginWithPassword(makeRepo(user), makeHash(false), nullLog);
    await expect(uc.execute("user@example.com", "wrong")).rejects.toThrow(UnauthorizedError);
  });

  it("normalises email before lookup", async () => {
    const repo = makeRepo(makeUser());
    const spy = jest.spyOn(repo, "findByEmail");
    const uc = new LoginWithPassword(repo, makeHash(true), nullLog);
    await uc.execute("  USER@Example.com  ", "secret");
    expect(spy).toHaveBeenCalledWith("user@example.com");
  });
});
