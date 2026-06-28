import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { PlaceModule } from "./modules/place/place.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        genReqId: (req) =>
          (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
        redact: ["req.headers.authorization", "*.password", "*.apiKey"],
        transport:
          process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
      },
    }),
    PlaceModule,
    DiscoveryModule,
    AuthModule,
  ],
})
export class AppModule {}
