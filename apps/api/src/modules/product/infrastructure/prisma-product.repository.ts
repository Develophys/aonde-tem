import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { ProductRepository, ProductStatus } from "@aonde-tem/domain";
import { Product } from "@aonde-tem/domain";
import type { BlockedTermChecker } from "../application/create-product.js";

function toProductStatus(value: string): ProductStatus {
  if (value === "active" || value === "under_review" || value === "blocked") return value;
  return "active";
}

function toBlockAction(value: string): "block" | "review" {
  if (value === "block" || value === "review") return value;
  return "block";
}

@Injectable()
export class PrismaProductRepository implements ProductRepository, BlockedTermChecker {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row
      ? Product.create({
          id: row.id,
          name: row.name,
          createdById: row.createdById,
          status: toProductStatus(row.status),
          createdAt: row.createdAt,
        })
      : null;
  }

  async findByNormalizedKey(key: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { normalizedKey: key } });
    return row
      ? Product.create({
          id: row.id,
          name: row.name,
          createdById: row.createdById,
          status: toProductStatus(row.status),
          createdAt: row.createdAt,
        })
      : null;
  }

  async searchByName(query: string, limit = 10): Promise<Product[]> {
    const rows = await this.prisma.$queryRaw<{
      id: string;
      name: string;
      normalizedKey: string;
      status: string;
      createdById: string;
      createdAt: Date;
    }[]>`
      SELECT id, name, "normalizedKey", status, "createdById", "createdAt"
      FROM products
      WHERE status = 'active'
        AND ("normalizedKey" % ${query} OR "normalizedKey" ILIKE ${"%" + query + "%"})
      ORDER BY similarity("normalizedKey", ${query}) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) =>
      Product.create({
        id: r.id,
        name: r.name,
        createdById: r.createdById,
        status: toProductStatus(r.status),
        createdAt: r.createdAt,
      }),
    );
  }

  async save(product: Product): Promise<void> {
    await this.prisma.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        name: product.name,
        normalizedKey: product.normalizedKey,
        status: product.status,
        createdById: product.createdById,
      },
      update: { name: product.name, status: product.status },
    });
  }

  async check(name: string): Promise<{ action: "block" | "review" } | null> {
    const lower = name.toLowerCase();
    const terms = await this.prisma.blockedTerm.findMany();
    const match = terms.find((t) => lower.includes(t.pattern.toLowerCase()));
    return match ? { action: toBlockAction(match.action) } : null;
  }
}
