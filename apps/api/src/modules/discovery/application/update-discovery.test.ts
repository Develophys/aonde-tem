import { UpdateDiscovery } from "./update-discovery.js";
import {
  Discovery,
  Price,
  Coordinates,
  ForbiddenError,
  NotFoundError,
  type DiscoveryRepository,
  type Logger,
} from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => nullLog,
};

const coords = Coordinates.create(-23.55, -46.63);

function makeDiscovery(overrides: Partial<Parameters<typeof Discovery.create>[0]> = {}): Discovery {
  return Discovery.create({
    id: "d1",
    productId: "p1",
    placeId: "pl1",
    price: Price.create(9.99),
    quantity: 5,
    reporterId: "owner",
    coords,
    ...overrides,
  });
}

function makeRepo(discovery: Discovery | null) {
  const updateCalls: { id: string; changes: unknown }[] = [];
  const repo: DiscoveryRepository = {
    findById: async () => discovery,
    findNearby: async () => [],
    findNearbyWithDetails: async () => [],
    findByPlace: async () => [],
    save: async () => {},
    delete: async () => {},
    update: async (id, changes) => {
      updateCalls.push({ id, changes });
    },
  };
  return { repo, updateCalls };
}

describe("UpdateDiscovery", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates price/quantity/note and refreshes the TTL for the owner", async () => {
    const discovery = makeDiscovery();
    const { repo, updateCalls } = makeRepo(discovery);
    const uc = new UpdateDiscovery(repo, nullLog);

    jest.advanceTimersByTime(1000);
    const before = Date.now();
    const result = await uc.execute(
      "d1",
      { priceBrl: 12.5, quantity: 2, note: "preço baixou" },
      "owner",
    );

    expect(result.price.cents).toBe(1250);
    expect(result.quantity).toBe(2);
    expect(result.note).toBe("preço baixou");
    expect(result.expiresAt.getTime()).toBeGreaterThan(discovery.expiresAt.getTime());
    expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]!.id).toBe("d1");
  });

  it("throws NotFoundError when the discovery does not exist", async () => {
    const { repo } = makeRepo(null);
    const uc = new UpdateDiscovery(repo, nullLog);

    await expect(uc.execute("missing", { priceBrl: 1, quantity: 1 }, "owner")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws ForbiddenError when the caller is not the current reporter", async () => {
    const discovery = makeDiscovery({ reporterId: "owner" });
    const { repo } = makeRepo(discovery);
    const uc = new UpdateDiscovery(repo, nullLog);

    await expect(uc.execute("d1", { priceBrl: 1, quantity: 1 }, "someone-else")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("throws NotFoundError when the discovery has expired", async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 48); // 48h ago
    const discovery = makeDiscovery({ createdAt: past });
    const { repo } = makeRepo(discovery);
    const uc = new UpdateDiscovery(repo, nullLog);

    await expect(uc.execute("d1", { priceBrl: 1, quantity: 1 }, "owner")).rejects.toThrow(
      NotFoundError,
    );
  });
});
