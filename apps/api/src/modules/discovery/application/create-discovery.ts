import {
  Discovery,
  Price,
  Coordinates,
  ValidationError,
  type DiscoveryRepository,
  type ProductRepository,
  type Logger,
} from "@aonde-tem/domain";
import { randomUUID } from "node:crypto";
import type { CreateDiscoveryDto } from "@aonde-tem/contracts";

/**
 * Kept for backwards compatibility — still implemented by PlaceUpsertServiceImpl,
 * but the real write path now uses saveWithPlace on the DiscoveryRepository.
 */
export interface PlaceUpsertService {
  findOrCreate(
    placeId: string | undefined,
    name: string,
    lat: number,
    lng: number,
    createdById: string,
  ): Promise<string>;
}

/**
 * Narrow interface so we only pull in the method we need from PrismaDiscoveryRepository.
 */
export interface DiscoveryRepositoryWithPlace extends DiscoveryRepository {
  saveWithPlace(
    discovery: Discovery,
    placeId: string | undefined,
    placeName: string,
    createdById: string,
  ): Promise<{ placeId: string; discoveryId: string }>;
}

export class CreateDiscovery {
  constructor(
    private readonly discoveries: DiscoveryRepositoryWithPlace,
    private readonly products: ProductRepository,
    private readonly log: Logger,
  ) {}

  async execute(dto: CreateDiscoveryDto, reporterId: string): Promise<Discovery> {
    const coords = Coordinates.create(dto.lat, dto.lng);
    const price = Price.create(dto.priceBrl);

    // Validate product exists and is active
    const product = await this.products.findById(dto.productId!);
    if (product?.status !== "active") {
      throw new ValidationError("Product is not available for discovery reporting");
    }

    // Create the discovery entity with a placeholder placeId — the real placeId
    // will be resolved atomically inside saveWithPlace.
    const discovery = Discovery.create({
      id: randomUUID(),
      productId: dto.productId!,
      placeId: dto.placeId ?? "pending", // resolved in saveWithPlace
      price,
      quantity: dto.quantity,
      reporterId,
      coords,
      note: dto.note,
    });

    const { placeId: resolvedPlaceId, discoveryId: resolvedDiscoveryId } =
      await this.discoveries.saveWithPlace(discovery, dto.placeId, dto.placeName, reporterId);

    const saved = Discovery.create({
      id: resolvedDiscoveryId,
      productId: discovery.productId,
      placeId: resolvedPlaceId,
      price: discovery.price,
      quantity: discovery.quantity,
      reporterId: discovery.reporterId,
      coords: discovery.coords,
      note: discovery.note,
      createdAt: discovery.createdAt,
      expiresAt: discovery.expiresAt,
    });

    this.log.info(
      {
        discoveryId: saved.id,
        placeId: resolvedPlaceId,
        upserted: resolvedDiscoveryId !== discovery.id,
      },
      "discovery saved",
    );
    return saved;
  }
}
