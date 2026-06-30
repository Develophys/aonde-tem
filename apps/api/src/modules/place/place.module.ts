import { Module } from "@nestjs/common";
import type { PlaceRepository, Logger } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import { PostgisPlaceRepository } from "./infrastructure/postgis-place.repository.js";
import { FindNearbyPlaces } from "./application/find-nearby-places.js";
import { CreatePlace } from "./application/create-place.js";
import {
  FindPlaceWithDiscoveries,
  type DiscoveryByPlaceFinder,
} from "./application/find-place-with-discoveries.js";
import { PrismaDiscoveryRepository } from "../discovery/infrastructure/prisma-discovery.repository.js";
import { PlaceController } from "./presentation/place.controller.js";

const PLACE_REPOSITORY = Symbol("PlaceRepository");
const DISCOVERY_FINDER = Symbol("DiscoveryByPlaceFinder");

@Module({
  controllers: [PlaceController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    { provide: PLACE_REPOSITORY, useClass: PostgisPlaceRepository },
    // A read-only instance of PrismaDiscoveryRepository used only for findByPlace.
    { provide: DISCOVERY_FINDER, useClass: PrismaDiscoveryRepository },
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
    {
      provide: FindPlaceWithDiscoveries,
      useFactory: (places: PlaceRepository, discoveries: DiscoveryByPlaceFinder) =>
        new FindPlaceWithDiscoveries(places, discoveries),
      inject: [PLACE_REPOSITORY, DISCOVERY_FINDER],
    },
  ],
})
export class PlaceModule {}
