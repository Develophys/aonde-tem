import { Module } from "@nestjs/common";
import type { DiscoveryRepository, Logger, ProductRepository } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import {
  PrismaDiscoveryRepository,
  PlaceUpsertServiceImpl,
} from "./infrastructure/prisma-discovery.repository.js";
import type { DiscoveryRepositoryWithPlace } from "./application/create-discovery.js";
import { FindNearbyDiscoveries } from "./application/find-nearby-discoveries.js";
import { CreateDiscovery } from "./application/create-discovery.js";
import { UpdateDiscovery } from "./application/update-discovery.js";
import { DeleteDiscovery } from "./application/delete-discovery.js";
import { DiscoveryController } from "./presentation/discovery.controller.js";
import { AuthModule } from "../auth/auth.module.js";
import { ProductModule } from "../product/product.module.js";

const DISCOVERY_REPOSITORY = Symbol("DiscoveryRepository");

@Module({
  imports: [AuthModule, ProductModule],
  controllers: [DiscoveryController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    { provide: DISCOVERY_REPOSITORY, useClass: PrismaDiscoveryRepository },
    PlaceUpsertServiceImpl,
    {
      provide: FindNearbyDiscoveries,
      useFactory: (repo: DiscoveryRepository, log: Logger) => new FindNearbyDiscoveries(repo, log),
      inject: [DISCOVERY_REPOSITORY, LOGGER],
    },
    {
      provide: CreateDiscovery,
      useFactory: (repo: DiscoveryRepositoryWithPlace, products: ProductRepository, log: Logger) =>
        new CreateDiscovery(repo, products, log),
      inject: [DISCOVERY_REPOSITORY, "ProductRepository", LOGGER],
    },
    {
      provide: UpdateDiscovery,
      useFactory: (repo: DiscoveryRepository, log: Logger) => new UpdateDiscovery(repo, log),
      inject: [DISCOVERY_REPOSITORY, LOGGER],
    },
    {
      provide: DeleteDiscovery,
      useFactory: (repo: DiscoveryRepository, log: Logger) => new DeleteDiscovery(repo, log),
      inject: [DISCOVERY_REPOSITORY, LOGGER],
    },
  ],
})
export class DiscoveryModule {}
