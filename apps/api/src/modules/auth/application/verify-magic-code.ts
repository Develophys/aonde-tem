import { UnauthorizedError, type UserRepository, type User, type Logger } from "@aonde-tem/domain";

export interface MagicCodeVerifier {
  verifyAndConsume(email: string, code: string): Promise<boolean>;
}

export class VerifyMagicCode {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: MagicCodeVerifier,
    private readonly log: Logger,
  ) {}

  async execute(email: string, code: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const valid = await this.codes.verifyAndConsume(normalizedEmail, code);
    if (!valid) {
      this.log.warn({ email: normalizedEmail }, "invalid or expired magic code");
      throw new UnauthorizedError("Invalid or expired code");
    }
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) throw new UnauthorizedError("User not found");
    this.log.info({ userId: user.id }, "magic code verified, user authenticated");
    return user;
  }
}
