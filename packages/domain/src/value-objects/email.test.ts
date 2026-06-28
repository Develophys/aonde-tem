import { Email } from "./email.js";
import { ValidationError } from "../errors/domain-error.js";

describe("Email", () => {
  it("normalises to lowercase", () => {
    expect(Email.create("User@Example.COM").value).toBe("user@example.com");
  });

  it("rejects missing @", () => {
    expect(() => Email.create("notanemail")).toThrow(ValidationError);
  });

  it("rejects empty string", () => {
    expect(() => Email.create("")).toThrow(ValidationError);
  });
});
