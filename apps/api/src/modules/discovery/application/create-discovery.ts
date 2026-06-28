import { Discovery, Price, Coordinates } from "@aonde-tem/domain";
import type { DiscoveryRepository } from "@aonde-tem/domain";
import type { Logger } from "@aonde-tem/domain";
import { randomUUID } from "node:crypto";
import type { CreateDiscoveryDto } from "@aonde-tem/contracts";

export interface PlaceUpsertService {
  findOrCreate(
    placeId: string | undefined,
    name: string,
    lat: number,
    lng: number,
    createdById: string,
  ): Promise<string>;
}

export class CreateDiscovery {
  constructor(
    private readonly discoveries: DiscoveryRepository,
    private readonly places: PlaceUpsertService,
    private readonly log: Logger,
  ) {}

  async execute(dto: CreateDiscoveryDto, reporterId: string): Promise<Discovery> {
    const coords = Coordinates.create(dto.lat, dto.lng);
    const price = Price.create(dto.priceBrl);

    const placeId = await this.places.findOrCreate(
      dto.placeId,
      dto.placeName,
      dto.lat,
      dto.lng,
      reporterId,
    );

    const discovery = Discovery.create({
      id: randomUUID(),
      productId: dto.productId!,
      placeId,
      price,
      quantity: dto.quantity,
      reporterId,
      coords,
      note: dto.note,
    });

    await this.discoveries.save(discovery);
    this.log.info({ discoveryId: discovery.id }, "discovery created");
    return discovery;
  }
}
