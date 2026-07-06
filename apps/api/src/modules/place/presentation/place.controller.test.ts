import { toDiscoveryItem } from "./place.controller.js";
import type { NearbyDiscoveryRow } from "@aonde-tem/domain";

function makeRow(overrides: Partial<NearbyDiscoveryRow> = {}): NearbyDiscoveryRow {
  return {
    id: "d1",
    productId: "p1",
    productName: "Arroz 5kg",
    placeId: "pl1",
    placeName: "Loja",
    priceBrl: 9.99,
    quantity: 3,
    note: null,
    reporterId: "owner",
    lat: -23.5,
    lng: -46.6,
    distanceMeters: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3_600_000),
    ...overrides,
  };
}

describe("toDiscoveryItem", () => {
  it("marks isMine true when the requesting user matches reporterId", () => {
    const item = toDiscoveryItem(makeRow({ reporterId: "u1" }), "u1");
    expect(item.isMine).toBe(true);
  });

  it("marks isMine false for a different user", () => {
    const item = toDiscoveryItem(makeRow({ reporterId: "u1" }), "u2");
    expect(item.isMine).toBe(false);
  });

  it("marks isMine false for an anonymous (undefined) requester", () => {
    const item = toDiscoveryItem(makeRow({ reporterId: "u1" }), undefined);
    expect(item.isMine).toBe(false);
  });

  it("never includes reporterId on the returned item", () => {
    const item = toDiscoveryItem(makeRow({ reporterId: "u1" }), "u1");
    expect(item).not.toHaveProperty("reporterId");
  });
});
