import { Module } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service.js";
import { PrismaProductRepository } from "./infrastructure/prisma-product.repository.js";
import { CreateProduct } from "./application/create-product.js";
import { ProductController } from "./presentation/product.controller.js";
import { AuthModule } from "../auth/auth.module.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import type { Logger } from "@aonde-tem/domain";

@Module({
  imports: [AuthModule],
  controllers: [ProductController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    { provide: "ProductRepository", useClass: PrismaProductRepository },
    PrismaProductRepository,
    {
      provide: CreateProduct,
      useFactory: (repo: PrismaProductRepository, log: Logger) =>
        new CreateProduct(repo, repo, log),
      inject: [PrismaProductRepository, LOGGER],
    },
  ],
  exports: ["ProductRepository", PrismaProductRepository],
})
export class ProductModule {}
