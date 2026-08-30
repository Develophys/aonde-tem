import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { NotFoundError, type ModeratableContentRepository } from "@aonde-tem/domain";
import { PrismaService } from "../../../shared/prisma.service.js";

/**
 * True for Prisma's "record to update not found" error (P2025). A card can go stale
 * between the queue being fetched and the admin tapping "Remover" — e.g. the content
 * was already deleted through some other path — and `prisma.update` throws this rather
 * than being a no-op.
 *
 * `PrismaClientKnownRequestError` is only exported through the `Prisma` namespace in
 * this generated client (Prisma 7) — there is no top-level named export for it in the
 * generated types, even though the runtime module happens to also expose one.
 */
function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

@Injectable()
export class PrismaModeratableContentRepository implements ModeratableContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hideDiscovery(id: string): Promise<void> {
    try {
      await this.prisma.discovery.update({ where: { id }, data: { hiddenAt: new Date() } });
    } catch (err) {
      // Rethrown as a domain NotFoundError (which AllExceptionsFilter maps to 404)
      // rather than left to fall through to the filter's generic 500 branch — Prisma
      // errors have no branch there, and this one is not "something went wrong",
      // it's "the thing you're trying to remove is already gone".
      if (isRecordNotFound(err)) throw new NotFoundError(`Discovery ${id} not found`);
      throw err;
    }
  }

  async blockProduct(id: string): Promise<void> {
    try {
      await this.prisma.product.update({ where: { id }, data: { status: "blocked" } });
    } catch (err) {
      if (isRecordNotFound(err)) throw new NotFoundError(`Product ${id} not found`);
      throw err;
    }
  }
}
