import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { UserRepository } from "@aonde-tem/domain";
import { User } from "@aonde-tem/domain";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return User.create({
      id: row.id,
      email: row.email,
      role: row.role as "user" | "admin",
      displayName: row.displayName ?? undefined,
      createdAt: row.createdAt,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!row) return null;
    return User.create({
      id: row.id,
      email: row.email,
      role: row.role as "user" | "admin",
      displayName: row.displayName ?? undefined,
      createdAt: row.createdAt,
    });
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.value,
        role: user.role,
        displayName: user.displayName ?? null,
      },
      update: {
        displayName: user.displayName ?? null,
      },
    });
  }
}
