import { Email } from "../value-objects/email";
import { ValidationError } from "../errors/domain-error";

export type UserRole = "user" | "admin";

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly role: UserRole,
    public readonly displayName: string | undefined,
    public readonly passwordHash: string | null,
    public readonly googleId: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    email: string;
    role: UserRole;
    displayName?: string;
    passwordHash?: string | null;
    googleId?: string | null;
    createdAt?: Date;
  }): User {
    if (!props.id.trim()) throw new ValidationError("User id is required");
    return new User(
      props.id,
      Email.create(props.email),
      props.role,
      props.displayName,
      props.passwordHash ?? null,
      props.googleId ?? null,
      props.createdAt ?? new Date(),
    );
  }

  hasPassword(): boolean {
    return this.passwordHash !== null;
  }

  isAdmin(): boolean {
    return this.role === "admin";
  }
}
