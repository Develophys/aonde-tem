import { Prisma } from "@prisma/client";
import { NotFoundError } from "@aonde-tem/domain";
import { PrismaModeratableContentRepository } from "./prisma-moderatable-content.repository.js";
import type { PrismaService } from "../../../shared/prisma.service.js";

function notFoundError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "An operation failed because it depends on one or more records that were required " +
      "but not found. Record to update not found.",
    { code: "P2025", clientVersion: "7.8.0" },
  );
}

function makePrisma() {
  const discoveryUpdate = jest.fn();
  const productUpdate = jest.fn();
  const prisma = {
    discovery: { update: discoveryUpdate },
    product: { update: productUpdate },
  } as unknown as PrismaService;
  return { prisma, discoveryUpdate, productUpdate };
}

describe("PrismaModeratableContentRepository", () => {
  it("hides a discovery by setting hiddenAt", async () => {
    const { prisma, discoveryUpdate } = makePrisma();
    discoveryUpdate.mockResolvedValue({});
    const repo = new PrismaModeratableContentRepository(prisma);

    await repo.hideDiscovery("d1");

    expect(discoveryUpdate).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { hiddenAt: expect.any(Date) },
    });
  });

  it("blocks a product by its status", async () => {
    const { prisma, productUpdate } = makePrisma();
    productUpdate.mockResolvedValue({});
    const repo = new PrismaModeratableContentRepository(prisma);

    await repo.blockProduct("p1");

    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "blocked" },
    });
  });

  // A card can go stale between the queue fetch and the tap: the target was already
  // deleted through some other path, and prisma.update throws P2025 rather than being
  // a no-op. Without this translation the request falls through to AllExceptionsFilter's
  // generic 500 branch, since it has no case for raw Prisma errors.
  it("translates a P2025 on hideDiscovery into a domain NotFoundError", async () => {
    const { prisma, discoveryUpdate } = makePrisma();
    discoveryUpdate.mockRejectedValue(notFoundError());
    const repo = new PrismaModeratableContentRepository(prisma);

    await expect(repo.hideDiscovery("gone")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("translates a P2025 on blockProduct into a domain NotFoundError", async () => {
    const { prisma, productUpdate } = makePrisma();
    productUpdate.mockRejectedValue(notFoundError());
    const repo = new PrismaModeratableContentRepository(prisma);

    await expect(repo.blockProduct("gone")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lets a non-P2025 error through unchanged", async () => {
    const { prisma, discoveryUpdate } = makePrisma();
    const other = new Error("connection lost");
    discoveryUpdate.mockRejectedValue(other);
    const repo = new PrismaModeratableContentRepository(prisma);

    await expect(repo.hideDiscovery("d1")).rejects.toBe(other);
  });
});
