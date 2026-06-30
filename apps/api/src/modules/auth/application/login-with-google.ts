import type { UserRepository, User, Logger } from "@aonde-tem/domain";
import { User as UserEntity } from "@aonde-tem/domain";

export class LoginWithGoogle {
  constructor(
    private readonly users: UserRepository,
    private readonly log: Logger,
  ) {}

  async execute(googleId: string, email: string, displayName: string): Promise<User> {
    const byGoogleId = await this.users.findByGoogleId(googleId);
    if (byGoogleId) return byGoogleId;

    const byEmail = await this.users.findByEmail(email.toLowerCase());
    if (byEmail) {
      await this.users.linkGoogleId(byEmail.id, googleId);
      this.log.info({ userId: byEmail.id }, "linked google id to existing account");
      return byEmail;
    }

    const { randomUUID } = await import("node:crypto");
    const newUser = UserEntity.create({
      id: randomUUID(),
      email: email.toLowerCase(),
      role: "user",
      displayName: displayName.trim() || undefined,
      googleId,
    });
    await this.users.save(newUser);
    this.log.info({ userId: newUser.id }, "new user created via google oauth");
    return newUser;
  }
}
