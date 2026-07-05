import {
  ForbiddenError,
  NotFoundError,
  type DiscoveryRepository,
  type Logger,
} from "@aonde-tem/domain";

export class DeleteDiscovery {
  constructor(
    private readonly discoveries: DiscoveryRepository,
    private readonly log: Logger,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const existing = await this.discoveries.findById(id);
    if (!existing) throw new NotFoundError(`Discovery ${id} not found`);
    if (existing.reporterId !== userId) {
      throw new ForbiddenError("You can only delete your own reports");
    }
    if (!existing.isFresh()) throw new NotFoundError(`Discovery ${id} not found`);

    await this.discoveries.delete(id);
    this.log.info({ discoveryId: id }, "discovery deleted");
  }
}
