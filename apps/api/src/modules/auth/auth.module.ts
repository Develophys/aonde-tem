import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import type { Logger } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository.js";
import { PrismaMagicCodeRepository } from "./infrastructure/prisma-magic-code.repository.js";
import { ConsoleEmailService } from "./infrastructure/resend-email.service.js";
import { SendMagicCode } from "./application/send-magic-code.js";
import { VerifyMagicCode } from "./application/verify-magic-code.js";
import { AuthController } from "./presentation/auth.controller.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env["JWT_SECRET"] ?? "dev-secret-change-in-production",
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    PrismaUserRepository,
    PrismaMagicCodeRepository,
    ConsoleEmailService,
    JwtAuthGuard,
    {
      provide: SendMagicCode,
      useFactory: (
        users: PrismaUserRepository,
        codes: PrismaMagicCodeRepository,
        email: ConsoleEmailService,
        log: Logger,
      ) => new SendMagicCode(users, codes, email, log),
      inject: [PrismaUserRepository, PrismaMagicCodeRepository, ConsoleEmailService, LOGGER],
    },
    {
      provide: VerifyMagicCode,
      useFactory: (
        users: PrismaUserRepository,
        codes: PrismaMagicCodeRepository,
        log: Logger,
      ) => new VerifyMagicCode(users, codes, log),
      inject: [PrismaUserRepository, PrismaMagicCodeRepository, LOGGER],
    },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
