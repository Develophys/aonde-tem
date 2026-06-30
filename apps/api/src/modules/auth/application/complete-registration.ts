import { UnauthorizedError } from "@aonde-tem/domain";
import type { UserRepository, User, Logger } from "@aonde-tem/domain";
import type { HashService } from "./hash.service.js";

export class CompleteRegistration {
  constructor(
    private readonly users: UserRepository,
    private readonly hash: HashService,
    private readonly log: Logger,
  ) {}

  async execute(userId: string, displayName: string, password: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError("User not found");
    if (user.hasPassword()) throw new UnauthorizedError("Registration already complete");
    const passwordHash = await this.hash.hash(password);
    await this.users.updateCredentials(userId, displayName.trim(), passwordHash);
    this.log.info({ userId }, "registration complete");
    const updated = await this.users.findById(userId);
    return updated!;
  }
}
