import { Coordinates } from "./coordinates";
import { ValidationError } from "../errors/domain-error";

describe("Coordinates", () => {
  it("creates a valid coordinate", () => {
    const c = Coordinates.create(-23.55, -46.63); // São Paulo
    expect(c.lat).toBe(-23.55);
    expect(c.lng).toBe(-46.63);
  });

  it("rejects out-of-range latitude", () => {
    expect(() => Coordinates.create(120, 0)).toThrow(ValidationError);
  });

  it("rejects out-of-range longitude", () => {
    expect(() => Coordinates.create(0, 200)).toThrow(ValidationError);
  });

  it("compares by value", () => {
    expect(Coordinates.create(1, 2).equals(Coordinates.create(1, 2))).toBe(true);
  });
});
