import { DeleteDiscovery } from "./delete-discovery.js";
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
  const deleteCalls: string[] = [];
  const repo: DiscoveryRepository = {
    findById: async () => discovery,
    findNearby: async () => [],
    findNearbyWithDetails: async () => [],
    findByPlace: async () => [],
    save: async () => {},
    update: async () => {},
    delete: async (id) => {
      deleteCalls.push(id);
    },
  };
  return { repo, deleteCalls };
}

describe("DeleteDiscovery", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("deletes the discovery for its current owner", async () => {
    const discovery = makeDiscovery();
    const { repo, deleteCalls } = makeRepo(discovery);
    const uc = new DeleteDiscovery(repo, nullLog);

    await uc.execute("d1", "owner");

    expect(deleteCalls).toEqual(["d1"]);
  });

  it("throws NotFoundError when the discovery does not exist", async () => {
    const { repo } = makeRepo(null);
    const uc = new DeleteDiscovery(repo, nullLog);

    await expect(uc.execute("missing", "owner")).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when the caller is not the current reporter", async () => {
    const discovery = makeDiscovery({ reporterId: "owner" });
    const { repo } = makeRepo(discovery);
    const uc = new DeleteDiscovery(repo, nullLog);

    await expect(uc.execute("d1", "someone-else")).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when the discovery has expired", async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 48);
    const discovery = makeDiscovery({ createdAt: past });
    const { repo } = makeRepo(discovery);
    const uc = new DeleteDiscovery(repo, nullLog);

    await expect(uc.execute("d1", "owner")).rejects.toThrow(NotFoundError);
  });
});
