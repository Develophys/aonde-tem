import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { Logger } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository.js";
import { PrismaMagicCodeRepository } from "./infrastructure/prisma-magic-code.repository.js";
import { ConsoleEmailService } from "./infrastructure/resend-email.service.js";
import { BcryptHashService } from "./infrastructure/bcrypt-hash.service.js";
import { GoogleStrategy } from "./infrastructure/google.strategy.js";
import { SendMagicCode } from "./application/send-magic-code.js";
import { VerifyMagicCode } from "./application/verify-magic-code.js";
import { LoginWithPassword } from "./application/login-with-password.js";
import { CompleteRegistration } from "./application/complete-registration.js";
import { LoginWithGoogle } from "./application/login-with-google.js";
import { AuthController } from "./presentation/auth.controller.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { HASH_SERVICE } from "./application/hash.service.js";

@Module({
  imports: [
    PassportModule,
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
    { provide: HASH_SERVICE, useClass: BcryptHashService },
    BcryptHashService,
    GoogleStrategy,
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
      useFactory: (users: PrismaUserRepository, codes: PrismaMagicCodeRepository, log: Logger) =>
        new VerifyMagicCode(users, codes, log),
      inject: [PrismaUserRepository, PrismaMagicCodeRepository, LOGGER],
    },
    {
      provide: LoginWithPassword,
      useFactory: (users: PrismaUserRepository, hash: BcryptHashService, log: Logger) =>
        new LoginWithPassword(users, hash, log),
      inject: [PrismaUserRepository, BcryptHashService, LOGGER],
    },
    {
      provide: CompleteRegistration,
      useFactory: (users: PrismaUserRepository, hash: BcryptHashService, log: Logger) =>
        new CompleteRegistration(users, hash, log),
      inject: [PrismaUserRepository, BcryptHashService, LOGGER],
    },
    {
      provide: LoginWithGoogle,
      useFactory: (users: PrismaUserRepository, log: Logger) => new LoginWithGoogle(users, log),
      inject: [PrismaUserRepository, LOGGER],
    },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
