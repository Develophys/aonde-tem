import { Module } from "@nestjs/common";
import type { FlagRepository, Logger } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import { PrismaFlagRepository } from "./infrastructure/prisma-flag.repository.js";
import { CreateFlag } from "./application/create-flag.js";
import { FlagController } from "./presentation/flag.controller.js";
import { AdminController } from "./presentation/admin.controller.js";
import { AdminGuard } from "./guards/admin.guard.js";
import { AuthModule } from "../auth/auth.module.js";

const FLAG_REPOSITORY = Symbol("FlagRepository");

@Module({
  imports: [AuthModule],
  controllers: [FlagController, AdminController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    { provide: FLAG_REPOSITORY, useClass: PrismaFlagRepository },
    PrismaFlagRepository,
    AdminGuard,
    {
      provide: CreateFlag,
      useFactory: (repo: FlagRepository, log: Logger) => new CreateFlag(repo, log),
      inject: [FLAG_REPOSITORY, LOGGER],
    },
  ],
})
export class FlagModule {}
