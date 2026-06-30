export const HASH_SERVICE = "HASH_SERVICE";

export interface HashService {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
