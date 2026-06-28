import type { Flag, FlagStatus } from "../entities/flag";

export interface FlagRepository {
  findById(id: string): Promise<Flag | null>;
  findOpen(limit?: number): Promise<Flag[]>;
  save(flag: Flag): Promise<void>;
  updateStatus(id: string, status: FlagStatus): Promise<void>;
}
