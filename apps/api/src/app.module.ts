import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { ThrottlerModule } from "@nestjs/throttler";
import { randomUUID } from "node:crypto";
import { PlaceModule } from "./modules/place/place.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { ProductModule } from "./modules/product/product.module.js";
import { FlagModule } from "./modules/flag/flag.module.js";
import { HealthModule } from "./shared/health/health.module.js";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
        redact: ["req.headers.authorization", "*.password", "*.apiKey"],
        transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    HealthModule,
    PlaceModule,
    DiscoveryModule,
    AuthModule,
    ProductModule,
    FlagModule,
  ],
  // ThrottlerGuard removed from global scope — applied per-route on write endpoints only
  providers: [],
})
export class AppModule {}
