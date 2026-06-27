/**
 * Base class for all domain errors. Pure — no framework / HTTP knowledge.
 * Each subclass carries a stable, machine-readable `code`.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
}
export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
}
export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
}
export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
}
export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
}
