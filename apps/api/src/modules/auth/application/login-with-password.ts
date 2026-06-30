import { UnauthorizedError } from "@aonde-tem/domain";
import type { UserRepository, User, Logger } from "@aonde-tem/domain";
import type { HashService } from "./hash.service.js";

export class LoginWithPassword {
  constructor(
    private readonly users: UserRepository,
    private readonly hash: HashService,
    private readonly log: Logger,
  ) {}

  async execute(email: string, password: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    if (!user || !user.hasPassword()) {
      throw new UnauthorizedError("Invalid credentials");
    }
    const valid = await this.hash.compare(password, user.passwordHash!);
    if (!valid) {
      this.log.warn({ email: normalized }, "bad password attempt");
      throw new UnauthorizedError("Invalid credentials");
    }
    return user;
  }
}
