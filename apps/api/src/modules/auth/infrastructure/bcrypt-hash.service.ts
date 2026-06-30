import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { HashService } from "../application/hash.service.js";

@Injectable()
export class BcryptHashService implements HashService {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
