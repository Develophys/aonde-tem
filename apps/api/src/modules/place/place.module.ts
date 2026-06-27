import { Module } from "@nestjs/common";
import type { PlaceRepository, Logger } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter";
import { PostgisPlaceRepository } from "./infrastructure/postgis-place.repository";
import { FindNearbyPlaces } from "./application/find-nearby-places";
import { CreatePlace } from "./application/create-place";
import { PlaceController } from "./presentation/place.controller";

const PLACE_REPOSITORY = Symbol("PlaceRepository");

@Module({
  controllers: [PlaceController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    { provide: PLACE_REPOSITORY, useClass: PostgisPlaceRepository },
    {
      provide: FindNearbyPlaces,
      useFactory: (repo: PlaceRepository, log: Logger) => new FindNearbyPlaces(repo, log),
      inject: [PLACE_REPOSITORY, LOGGER],
    },
    {
      provide: CreatePlace,
      useFactory: (repo: PlaceRepository, log: Logger) => new CreatePlace(repo, log),
      inject: [PLACE_REPOSITORY, LOGGER],
    },
  ],
})
export class PlaceModule {}
