import { Price } from "./price";
import { ValidationError } from "../errors/domain-error";

describe("Price", () => {
  it("stores cents as integer", () => {
    expect(Price.create(9.99).cents).toBe(999);
  });

  it("formats BRL string", () => {
    expect(Price.create(9.99).formatted).toBe("R$ 9,99");
  });

  it("rejects zero", () => {
    expect(() => Price.create(0)).toThrow(ValidationError);
  });

  it("rejects negative", () => {
    expect(() => Price.create(-1)).toThrow(ValidationError);
  });

  it("rejects above max (R$99999.99)", () => {
    expect(() => Price.create(100_000)).toThrow(ValidationError);
  });
});
