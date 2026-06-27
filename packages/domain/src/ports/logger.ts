/** Port: structured logger. The core depends on this, not on pino. */
export interface Logger {
  debug(meta: object, msg: string): void;
  info(meta: object, msg: string): void;
  warn(meta: object, msg: string): void;
  error(meta: object, msg: string): void;
  child(bindings: object): Logger;
}
