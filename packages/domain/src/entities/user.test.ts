import { User } from "./user";
import { ValidationError } from "../errors/domain-error";

describe("User", () => {
  it("creates valid user", () => {
    const u = User.create({
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "a@b.com",
      role: "user",
    });
    expect(u.email.value).toBe("a@b.com");
    expect(u.role).toBe("user");
  });

  it("rejects invalid email", () => {
    expect(() =>
      User.create({
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "bad",
        role: "user",
      })
    ).toThrow(ValidationError);
  });

  it("allows admin role", () => {
    const u = User.create({
      id: "550e8400-e29b-41d4-a716-446655440001",
      email: "admin@b.com",
      role: "admin",
    });
    expect(u.isAdmin()).toBe(true);
  });
});
