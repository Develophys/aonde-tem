import { Controller, Post, Get, Body, Query, Req, UseGuards, Inject } from "@nestjs/common";
import { createProductSchema, type ProductResponse } from "@aonde-tem/contracts";
import { JwtAuthGuard, type JwtPayload } from "../../auth/guards/jwt-auth.guard.js";
import { CreateProduct } from "../application/create-product.js";
import type { ProductRepository } from "@aonde-tem/domain";

interface AuthenticatedRequest {
  user: JwtPayload;
}

@Controller("products")
export class ProductController {
  constructor(
    @Inject(CreateProduct) private readonly createProduct: CreateProduct,
    @Inject("ProductRepository") private readonly products: ProductRepository,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: unknown, @Req() req: AuthenticatedRequest): Promise<ProductResponse> {
    const dto = createProductSchema.parse(body);
    const product = await this.createProduct.execute(dto.name, req.user.sub);
    return {
      id: product.id,
      name: product.name,
      normalizedKey: product.normalizedKey,
      status: product.status,
      description: null,
      imageUrl: null,
      createdAt: product.createdAt.toISOString(),
    };
  }

  @Get()
  async search(@Query("q") q: string): Promise<{ results: { id: string; name: string }[] }> {
    if (!q || q.length < 1) return { results: [] };
    const products = await this.products.searchByName(
      q
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim(),
      10,
    );
    return { results: products.map((p) => ({ id: p.id, name: p.name })) };
  }
}
