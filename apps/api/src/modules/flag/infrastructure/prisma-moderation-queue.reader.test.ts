import { toQueueRow, type RawQueueRow } from "./prisma-moderation-queue.reader.js";

const LATEST = new Date("2026-08-30T12:00:00.000Z");

function raw(overrides: Partial<RawQueueRow> = {}): RawQueueRow {
  return {
    targetType: "discovery",
    targetId: "d1",
    targetName: "Arroz 5kg",
    placeName: "Mercadinho do Zé",
    price: "24.90",
    flagCount: 1n,
    reasons: ["spam"],
    latestComment: null,
    latestReporterEmail: "quem@denunciou.com",
    latestAt: LATEST,
    ...overrides,
  };
}

describe("toQueueRow", () => {
  it("parses the DECIMAL price string into a number", () => {
    expect(toQueueRow(raw()).priceBrl).toBe(24.9);
  });

  it("narrows the BigInt count from COUNT(*) to a number", () => {
    const row = toQueueRow(raw({ flagCount: 3n }));
    expect(row.flagCount).toBe(3);
    expect(typeof row.flagCount).toBe("number");
  });

  it("leaves a product target with no place and no price", () => {
    const row = toQueueRow(
      raw({ targetType: "product", targetId: "p1", placeName: null, price: null }),
    );
    expect(row.placeName).toBeNull();
    expect(row.priceBrl).toBeNull();
  });

  it("keeps a deleted target's null name", () => {
    expect(toQueueRow(raw({ targetName: null, price: null })).targetName).toBeNull();
  });
});
