import type { User } from "../entities/user";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  save(user: User): Promise<void>;
  updateCredentials(userId: string, displayName: string, passwordHash: string): Promise<void>;
  linkGoogleId(userId: string, googleId: string): Promise<void>;
}
