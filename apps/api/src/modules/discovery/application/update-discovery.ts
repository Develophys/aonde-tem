import {
  Discovery,
  Price,
  ForbiddenError,
  NotFoundError,
  DISCOVERY_DEFAULT_TTL_MS,
  type DiscoveryRepository,
  type Logger,
} from "@aonde-tem/domain";
import type { UpdateDiscoveryDto } from "@aonde-tem/contracts";

export class UpdateDiscovery {
  constructor(
    private readonly discoveries: DiscoveryRepository,
    private readonly log: Logger,
  ) {}

  async execute(id: string, dto: UpdateDiscoveryDto, userId: string): Promise<Discovery> {
    const existing = await this.discoveries.findById(id);
    if (!existing) throw new NotFoundError(`Discovery ${id} not found`);
    if (existing.reporterId !== userId) {
      throw new ForbiddenError("You can only edit your own reports");
    }
    if (!existing.isFresh()) throw new NotFoundError(`Discovery ${id} not found`);

    const price = Price.create(dto.priceBrl);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DISCOVERY_DEFAULT_TTL_MS);

    const updated = Discovery.create({
      id: existing.id,
      productId: existing.productId,
      placeId: existing.placeId,
      price,
      quantity: dto.quantity,
      reporterId: existing.reporterId,
      coords: existing.coords,
      note: dto.note,
      createdAt: now,
      expiresAt,
    });

    await this.discoveries.update(id, {
      price,
      quantity: dto.quantity,
      note: dto.note,
      expiresAt,
      createdAt: now,
    });

    this.log.info({ discoveryId: id }, "discovery updated");
    return updated;
  }
}
