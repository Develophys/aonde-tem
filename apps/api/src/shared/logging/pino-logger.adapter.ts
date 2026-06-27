import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import type { Logger } from "@aonde-tem/domain";

/** Adapts nestjs-pino to the domain Logger port so use cases stay framework-free. */
@Injectable()
export class PinoLoggerAdapter implements Logger {
  constructor(private readonly pino: PinoLogger) {}

  debug(meta: object, msg: string): void { this.pino.debug(meta, msg); }
  info(meta: object, msg: string): void { this.pino.info(meta, msg); }
  warn(meta: object, msg: string): void { this.pino.warn(meta, msg); }
  error(meta: object, msg: string): void { this.pino.error(meta, msg); }
  child(_bindings: object): Logger { return this; }
}

export const LOGGER = Symbol("Logger");
