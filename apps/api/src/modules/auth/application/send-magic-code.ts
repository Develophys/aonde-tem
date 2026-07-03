import { randomInt, randomUUID } from "node:crypto";
import { User, type UserRepository, type Logger } from "@aonde-tem/domain";

export interface MagicCodeRepository {
  save(email: string, code: string, expiresAt: Date): Promise<void>;
}

export interface EmailService {
  sendMagicCode(email: string, code: string): Promise<void>;
}

function generateCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export class SendMagicCode {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: MagicCodeRepository,
    private readonly email: EmailService,
    private readonly log: Logger,
  ) {}

  async execute(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    this.log.info({ email }, "sending magic code");

    // Ensure user exists (create on first sign-in)
    let user = await this.users.findByEmail(email);
    if (!user) {
      user = User.create({ id: randomUUID(), email, role: "user" });
      await this.users.save(user);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.codes.save(email, code, expiresAt);
    await this.email.sendMagicCode(email, code);
    this.log.info({ email }, "magic code sent");
  }
}
