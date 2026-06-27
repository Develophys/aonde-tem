import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import { ZodError } from "zod";
import {
  DomainError, ValidationError, NotFoundError, ConflictError,
  UnauthorizedError, ForbiddenError,
} from "@aonde-tem/domain";
import type { ErrorResponse } from "@aonde-tem/contracts";

const STATUS = new Map<Function, number>([
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const requestId: string | undefined = req.id;

    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Something went wrong";
    let details: unknown;

    if (err instanceof DomainError) {
      status = STATUS.get(err.constructor) ?? 400;
      code = err.code;
      message = err.message;
      details = err.details;
    } else if (err instanceof ZodError) {
      status = 400;
      code = "VALIDATION_ERROR";
      message = "Invalid input";
      details = err.flatten();
    } else if (err instanceof HttpException) {
      status = err.getStatus();
      message = err.message;
      code = "HTTP_ERROR";
    }

    // 5xx = unexpected (log with stack); 4xx = expected (warn).
    req.log?.[status >= 500 ? "error" : "warn"]({ err, code, requestId }, message);

    const body: ErrorResponse = { error: { code, message, details, requestId } };
    res.status(status).json(body);
  }
}
