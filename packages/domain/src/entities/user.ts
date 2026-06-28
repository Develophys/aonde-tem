import { Email } from "../value-objects/email.js";
import { ValidationError } from "../errors/domain-error.js";

export type UserRole = "user" | "admin";

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly role: UserRole,
    public readonly displayName: string | undefined,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    email: string;
    role: UserRole;
    displayName?: string;
    createdAt?: Date;
  }): User {
    if (!props.id.trim()) throw new ValidationError("User id is required");
    return new User(
      props.id,
      Email.create(props.email),
      props.role,
      props.displayName,
      props.createdAt ?? new Date(),
    );
  }

  isAdmin(): boolean {
    return this.role === "admin";
  }
}
