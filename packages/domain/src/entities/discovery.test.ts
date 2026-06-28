import { Discovery, DISCOVERY_DEFAULT_TTL_MS } from "./discovery.js";
import { Price } from "../value-objects/price.js";
import { Coordinates } from "../value-objects/coordinates.js";
import { ValidationError } from "../errors/domain-error.js";

const coords = Coordinates.create(-23.55, -46.63);
const price = Price.create(5.99);

describe("Discovery", () => {
  it("creates with expiresAt = createdAt + TTL", () => {
    const now = new Date(2026, 0, 1, 12, 0, 0);
    const s = Discovery.create({
      id: "s1", productId: "p1", placeId: "pl1",
      price, quantity: 10, reporterId: "u1",
      coords, createdAt: now,
    });
    expect(s.expiresAt.getTime()).toBe(now.getTime() + DISCOVERY_DEFAULT_TTL_MS);
  });

  it("is fresh when not expired", () => {
    const s = Discovery.create({
      id: "s1", productId: "p1", placeId: "pl1",
      price, quantity: 5, reporterId: "u1", coords,
    });
    expect(s.isFresh()).toBe(true);
  });

  it("is stale when past expiresAt", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 48); // 48h ago
    const s = Discovery.create({
      id: "s1", productId: "p1", placeId: "pl1",
      price, quantity: 5, reporterId: "u1", coords,
      createdAt: past,
    });
    expect(s.isFresh()).toBe(false);
  });

  it("rejects zero quantity", () => {
    expect(() =>
      Discovery.create({ id: "s1", productId: "p1", placeId: "pl1", price, quantity: 0, reporterId: "u1", coords })
    ).toThrow(ValidationError);
  });
});
