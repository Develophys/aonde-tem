import type { Product } from "../entities/product";

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findByNormalizedKey(key: string): Promise<Product | null>;
  searchByName(query: string, limit?: number): Promise<Product[]>;
  save(product: Product): Promise<void>;
}
