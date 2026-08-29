import { FindMyDiscoveries } from "./find-my-discoveries.js";
import type { DiscoveryRepository, Logger, ReporterDiscoveryRow } from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => nullLog,
};

const NOW = new Date("2026-08-29T12:00:00.000Z");
const MEMBER_SINCE = new Date("2026-06-14T09:30:00.000Z");

function row(overrides: Partial<ReporterDiscoveryRow> = {}): ReporterDiscoveryRow {
  return {
    id: "d1",
    productId: "p1",
    productName: "Arroz 5kg",
    placeId: "pl1",
    placeName: "Mercadinho do Zé",
    priceBrl: 24.9,
    quantity: 3,
    note: null,
    createdAt: new Date("2026-08-29T11:00:00.000Z"),
    expiresAt: new Date("2026-08-29T23:00:00.000Z"),
    ...overrides,
  };
}

function makeRepo(rows: ReporterDiscoveryRow[]) {
  const calls: { reporterId: string; limit?: number }[] = [];
  const repo = {
    findById: async () => null,
    findNearby: async () => [],
    findNearbyWithDetails: async () => [],
    findByPlace: async () => [],
    findByReporter: async (reporterId: string, limit?: number) => {
      calls.push({ reporterId, limit });
      return rows;
    },
    save: async () => {},
    update: async () => {},
    delete: async () => {},
  } as unknown as DiscoveryRepository;
  return { repo, calls };
}

function makeUsers(createdAt: Date | null) {
  return {
    findCreatedAt: async () => createdAt,
  };
}

describe("FindMyDiscoveries", () => {
  it("returns the reporter's own rows, asking the repository for that reporter", async () => {
    const { repo, calls } = makeRepo([row()]);
    const useCase = new FindMyDiscoveries(repo, makeUsers(MEMBER_SINCE), nullLog);

    const result = await useCase.execute({ reporterId: "u1", now: NOW });

    expect(calls).toEqual([{ reporterId: "u1", limit: 50 }]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.productName).toBe("Arroz 5kg");
  });

  it("marks a row whose expiry has passed as expired, and one still in the future as not", async () => {
    const { repo } = makeRepo([
      row({ id: "fresh", expiresAt: new Date("2026-08-29T23:00:00.000Z") }),
      row({ id: "stale", expiresAt: new Date("2026-08-29T06:00:00.000Z") }),
    ]);
    const useCase = new FindMyDiscoveries(repo, makeUsers(MEMBER_SINCE), nullLog);

    const result = await useCase.execute({ reporterId: "u1", now: NOW });

    expect(result.results.find((r) => r.id === "fresh")!.isExpired).toBe(false);
    expect(result.results.find((r) => r.id === "stale")!.isExpired).toBe(true);
  });

  it("counts every row as total but only unexpired ones as active", async () => {
    const { repo } = makeRepo([
      row({ id: "a", expiresAt: new Date("2026-08-29T23:00:00.000Z") }),
      row({ id: "b", expiresAt: new Date("2026-08-29T22:00:00.000Z") }),
      row({ id: "c", expiresAt: new Date("2026-08-29T06:00:00.000Z") }),
    ]);
    const useCase = new FindMyDiscoveries(repo, makeUsers(MEMBER_SINCE), nullLog);

    const result = await useCase.execute({ reporterId: "u1", now: NOW });

    expect(result.stats.total).toBe(3);
    expect(result.stats.active).toBe(2);
  });

  it("reports the account's creation date as memberSince", async () => {
    const { repo } = makeRepo([]);
    const useCase = new FindMyDiscoveries(repo, makeUsers(MEMBER_SINCE), nullLog);

    const result = await useCase.execute({ reporterId: "u1", now: NOW });

    expect(result.stats.memberSince).toEqual(MEMBER_SINCE);
  });

  it("returns empty results and zeroed counts for a reporter who has never reported", async () => {
    const { repo } = makeRepo([]);
    const useCase = new FindMyDiscoveries(repo, makeUsers(MEMBER_SINCE), nullLog);

    const result = await useCase.execute({ reporterId: "u1", now: NOW });

    expect(result.results).toEqual([]);
    expect(result.stats.total).toBe(0);
    expect(result.stats.active).toBe(0);
  });

  it("throws when the account cannot be found, rather than inventing a member-since date", async () => {
    const { repo } = makeRepo([]);
    const useCase = new FindMyDiscoveries(repo, makeUsers(null), nullLog);

    await expect(useCase.execute({ reporterId: "ghost", now: NOW })).rejects.toThrow(/ghost/);
  });
});
