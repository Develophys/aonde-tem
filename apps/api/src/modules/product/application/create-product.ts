import { Product, ConflictError, type ProductRepository, type Logger } from "@aonde-tem/domain";
import { randomUUID } from "node:crypto";

export interface BlockedTermChecker {
  check(name: string): Promise<{ action: "block" | "review" } | null>;
}

export class CreateProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly blocklist: BlockedTermChecker,
    private readonly log: Logger,
  ) {}

  async execute(name: string, createdById: string): Promise<Product> {
    const trimmed = name.trim();
    this.log.info({ name: trimmed, createdById }, "create product");

    // Dedup: check normalizedKey first
    const tempProduct = Product.create({ id: "tmp", name: trimmed, createdById });
    const existing = await this.products.findByNormalizedKey(tempProduct.normalizedKey);
    if (existing) {
      this.log.info({ productId: existing.id }, "reused existing product");
      return existing;
    }

    // Blocklist check
    const blocked = await this.blocklist.check(trimmed);
    if (blocked?.action === "block") {
      throw new ConflictError(`This product is not allowed: "${trimmed}"`);
    }
    const status = blocked?.action === "review" ? "under_review" : "active";

    const product = Product.create({ id: randomUUID(), name: trimmed, createdById, status });
    await this.products.save(product);
    return product;
  }
}
