import { Product } from "./product";
import { ValidationError } from "../errors/domain-error";

describe("Product", () => {
  it("normalises key: strips accents, punctuation, lowercases", () => {
    const p = Product.create({ id: "1", name: "Coca-Cola 2L", createdById: "u1" });
    expect(p.normalizedKey).toBe("coca cola 2l");
  });

  it("creates with active status by default", () => {
    const p = Product.create({ id: "1", name: "Arroz", createdById: "u1" });
    expect(p.status).toBe("active");
  });

  it("rejects empty name", () => {
    expect(() => Product.create({ id: "1", name: "  ", createdById: "u1" })).toThrow(ValidationError);
  });

  it("allows under_review status", () => {
    const p = Product.create({ id: "1", name: "X", createdById: "u1", status: "under_review" });
    expect(p.isVisible()).toBe(false);
  });
});
