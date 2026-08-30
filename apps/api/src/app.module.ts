import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
    ConfigModule.forRoot({ envFilePath: "../../.env", isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
        // Allow-list what a request contributes to a log line, rather than blocking the
        // parts we happen to remember. pino's default req serializer emits every header,
        // which put session cookies (and anything else a browser sends) into the log on
        // *every* line of a request, since pino-http binds req to the child logger.
        // `redact` below is a block-list and stays as defence in depth, but only this
        // decides what actually gets out.
        serializers: {
          req: (req: { id: unknown; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
        },
        redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.apiKey"],
        transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
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
