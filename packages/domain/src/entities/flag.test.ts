import { Flag } from "./flag";
import { ValidationError } from "../errors/domain-error";

describe("Flag", () => {
  it("creates open flag", () => {
    const f = Flag.create({
      id: "f1", targetType: "discovery", targetId: "s1",
      reason: "spam", reporterId: "u1",
    });
    expect(f.status).toBe("open");
  });

  it("rejects invalid reason", () => {
    expect(() =>
      Flag.create({ id: "f1", targetType: "product", targetId: "p1",
        reason: "bad_reason" as any, reporterId: "u1" })
    ).toThrow(ValidationError);
  });
});
