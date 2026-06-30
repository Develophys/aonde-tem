// apps/api/src/modules/auth/application/login-with-google.test.ts
import { LoginWithGoogle } from "./login-with-google.js";
import { User } from "@aonde-tem/domain";
import type { UserRepository } from "@aonde-tem/domain";
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
    googleId: "google-123",
    ...overrides,
  });
}

function makeRepo(): jest.Mocked<UserRepository> {
  return {
    findById: jest.fn((_id: string) => Promise.resolve(null)),
    findByEmail: jest.fn((_email: string) => Promise.resolve(null)),
    findByGoogleId: jest.fn((_googleId: string) => Promise.resolve(null)),
    save: jest.fn((_user: User) => Promise.resolve()),
    updateCredentials: jest.fn((_userId: string, _displayName: string, _passwordHash: string) =>
      Promise.resolve(),
    ),
    linkGoogleId: jest.fn((_userId: string, _googleId: string) => Promise.resolve()),
  };
}

describe("LoginWithGoogle", () => {
  it("returns existing user when googleId is already linked", async () => {
    const existing = makeUser();
    const repo = makeRepo();
    repo.findByGoogleId.mockResolvedValueOnce(existing);
    const uc = new LoginWithGoogle(repo, nullLog);
    const result = await uc.execute("google-123", "user@example.com", "Test User");
    expect(result.id).toBe(existing.id);
    expect(repo.findByGoogleId).toHaveBeenCalledWith("google-123");
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.linkGoogleId).not.toHaveBeenCalled();
  });

  it("links googleId to existing account found by email", async () => {
    const existing = makeUser({ googleId: null });
    const repo = makeRepo();
    repo.findByGoogleId.mockResolvedValueOnce(null);
    repo.findByEmail.mockResolvedValueOnce(existing);
    const uc = new LoginWithGoogle(repo, nullLog);
    const result = await uc.execute("google-456", "user@example.com", "Test User");
    expect(result.id).toBe(existing.id);
    expect(repo.linkGoogleId).toHaveBeenCalledWith(existing.id, "google-456");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("normalises email to lowercase when looking up by email", async () => {
    const repo = makeRepo();
    const uc = new LoginWithGoogle(repo, nullLog);
    await uc.execute("google-789", "User@Example.COM", "Test User");
    expect(repo.findByEmail).toHaveBeenCalledWith("user@example.com");
  });

  it("creates a new user when neither googleId nor email is known", async () => {
    const repo = makeRepo();
    const uc = new LoginWithGoogle(repo, nullLog);
    const result = await uc.execute("google-new", "new@example.com", "New User");
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result.email.value).toBe("new@example.com");
    expect(result.googleId).toBe("google-new");
    expect(result.displayName).toBe("New User");
    expect(result.role).toBe("user");
    expect(result.passwordHash).toBeNull();
  });

  it("creates new user with trimmed displayName", async () => {
    const repo = makeRepo();
    const uc = new LoginWithGoogle(repo, nullLog);
    const result = await uc.execute("google-new", "new@example.com", "  Spaced Name  ");
    expect(result.displayName).toBe("Spaced Name");
  });

  it("creates new user with undefined displayName when display name is empty", async () => {
    const repo = makeRepo();
    const uc = new LoginWithGoogle(repo, nullLog);
    const result = await uc.execute("google-new", "new@example.com", "");
    expect(result.displayName).toBeUndefined();
  });

  it("normalises email to lowercase when creating new user", async () => {
    const repo = makeRepo();
    const uc = new LoginWithGoogle(repo, nullLog);
    const result = await uc.execute("google-new", "New@Example.COM", "Test");
    expect(result.email.value).toBe("new@example.com");
  });
});
