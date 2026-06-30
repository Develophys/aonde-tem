// apps/api/src/modules/auth/application/complete-registration.test.ts
import { CompleteRegistration } from "./complete-registration.js";
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

const USER_ID = "550e8400-e29b-41d4-a716-446655440001";

function makeNewUser(): User {
  return User.create({ id: USER_ID, email: "u@b.com", role: "user" });
}

function makeExistingUser(): User {
  return User.create({ id: USER_ID, email: "u@b.com", role: "user", passwordHash: "$2b$12$x" });
}

function makeRepo(user: User | null): jest.Mocked<UserRepository> {
  return {
    findById: jest.fn((_id: string) => Promise.resolve(user)),
    findByEmail: jest.fn((_email: string) => Promise.resolve(null)),
    findByGoogleId: jest.fn((_googleId: string) => Promise.resolve(null)),
    save: jest.fn((_user: User) => Promise.resolve()),
    updateCredentials: jest.fn((_userId: string, _displayName: string, _passwordHash: string) =>
      Promise.resolve(),
    ),
    linkGoogleId: jest.fn((_userId: string, _googleId: string) => Promise.resolve()),
  };
}

const fakeHash: HashService = {
  hash: async (_p) => "$2b$12$hashed",
  compare: async () => false,
};

describe("CompleteRegistration", () => {
  it("hashes password and calls updateCredentials", async () => {
    const repo = makeRepo(makeNewUser());
    const uc = new CompleteRegistration(repo, fakeHash, nullLog);
    await uc.execute(USER_ID, "Ana Silva", "secret123");
    expect(repo.updateCredentials).toHaveBeenCalledWith(USER_ID, "Ana Silva", "$2b$12$hashed");
  });

  it("throws UnauthorizedError when user not found", async () => {
    const repo = makeRepo(null);
    const uc = new CompleteRegistration(repo, fakeHash, nullLog);
    await expect(uc.execute(USER_ID, "Ana", "secret")).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when user already has password", async () => {
    const repo = makeRepo(makeExistingUser());
    const uc = new CompleteRegistration(repo, fakeHash, nullLog);
    await expect(uc.execute(USER_ID, "Ana", "secret")).rejects.toThrow(UnauthorizedError);
  });

  it("returns the updated user after registration", async () => {
    const updated = User.create({
      id: USER_ID,
      email: "u@b.com",
      role: "user",
      displayName: "Ana Silva",
      passwordHash: "$2b$12$hashed",
    });
    const repo = makeRepo(makeNewUser());
    repo.findById.mockResolvedValueOnce(makeNewUser()).mockResolvedValueOnce(updated);
    const uc = new CompleteRegistration(repo, fakeHash, nullLog);
    const result = await uc.execute(USER_ID, "Ana Silva", "secret123");
    expect(result.displayName).toBe("Ana Silva");
  });
});
