import { ValidationError } from "../errors/domain-error";

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const v = raw.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      throw new ValidationError("Invalid email address");
    }
    return new Email(v);
  }
}
