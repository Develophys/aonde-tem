import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { UserRepository } from "@aonde-tem/domain";
import { User } from "@aonde-tem/domain";

function hydrate(row: {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  password: string | null;
  googleId: string | null;
  createdAt: Date;
}): User {
  return User.create({
    id: row.id,
    email: row.email,
    role: row.role as "user" | "admin",
    displayName: row.displayName ?? undefined,
    passwordHash: row.password ?? null,
    googleId: row.googleId ?? null,
    createdAt: row.createdAt,
  });
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? hydrate(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? hydrate(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { googleId } });
    return row ? hydrate(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.value,
        role: user.role,
        displayName: user.displayName ?? null,
        password: user.passwordHash ?? null,
        googleId: user.googleId ?? null,
      },
      update: {
        displayName: user.displayName ?? null,
        googleId: user.googleId ?? null,
      },
    });
  }

  async updateCredentials(
    userId: string,
    displayName: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { displayName, password: passwordHash },
    });
  }

  async linkGoogleId(userId: string, googleId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
  }
}
