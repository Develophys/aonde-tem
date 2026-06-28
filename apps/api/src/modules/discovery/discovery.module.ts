import { Module } from "@nestjs/common";
import type { DiscoveryRepository, Logger } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import { PrismaDiscoveryRepository } from "./infrastructure/prisma-discovery.repository.js";
import { FindNearbyDiscoveries } from "./application/find-nearby-discoveries.js";
import { DiscoveryController } from "./presentation/discovery.controller.js";

const DISCOVERY_REPOSITORY = Symbol("DiscoveryRepository");

@Module({
  controllers: [DiscoveryController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    { provide: DISCOVERY_REPOSITORY, useClass: PrismaDiscoveryRepository },
    {
      provide: FindNearbyDiscoveries,
      useFactory: (repo: DiscoveryRepository, log: Logger) =>
        new FindNearbyDiscoveries(repo, log),
      inject: [DISCOVERY_REPOSITORY, LOGGER],
    },
  ],
})
export class DiscoveryModule {}
