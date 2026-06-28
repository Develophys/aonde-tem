import { ValidationError } from "../errors/domain-error.js";

export type ProductStatus = "active" | "under_review" | "blocked";

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export class Product {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly normalizedKey: string,
    public readonly status: ProductStatus,
    public readonly createdById: string,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    createdById: string;
    status?: ProductStatus;
    description?: string;
    imageUrl?: string;
    createdAt?: Date;
  }): Product {
    const name = props.name.trim();
    if (name.length === 0) throw new ValidationError("Product name is required");
    return new Product(
      props.id,
      name,
      normalize(name),
      props.status ?? "active",
      props.createdById,
      props.description,
      props.imageUrl,
      props.createdAt ?? new Date(),
    );
  }

  isVisible(): boolean {
    return this.status === "active";
  }
}
