import { ValidationError } from "../errors/domain-error";

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const v = raw.trim().toLowerCase();
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    // HTML5-spec email pattern (browsers' <input type="email"> check) — bounded label
    // lengths avoid the super-linear backtracking a naive `[^@]+@[^@]+\.[^@]+` risks.
    if (!emailRegex.test(v)) {
      throw new ValidationError("Invalid email address");
    }
    return new Email(v);
  }
}
