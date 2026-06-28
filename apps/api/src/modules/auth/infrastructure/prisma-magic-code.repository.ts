import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { MagicCodeRepository } from "../application/send-magic-code.js";
import type { MagicCodeVerifier } from "../application/verify-magic-code.js";

@Injectable()
export class PrismaMagicCodeRepository implements MagicCodeRepository, MagicCodeVerifier {
  constructor(private readonly prisma: PrismaService) {}

  async save(email: string, code: string, expiresAt: Date): Promise<void> {
    await this.prisma.magicCode.create({ data: { email, code, expiresAt } });
  }

  async verifyAndConsume(email: string, code: string): Promise<boolean> {
    const record = await this.prisma.magicCode.findFirst({
      where: { email, code, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) return false;
    await this.prisma.magicCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return true;
  }
}
