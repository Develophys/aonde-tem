import type { Price } from "../value-objects/price";
import type { Coordinates } from "../value-objects/coordinates";
import { ValidationError } from "../errors/domain-error";

export const DISCOVERY_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class Discovery {
  private constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly placeId: string,
    public readonly price: Price,
    public readonly quantity: number,
    public readonly reporterId: string,
    public readonly coords: Coordinates,
    public readonly note: string | undefined,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
  ) {}

  static create(props: {
    id: string;
    productId: string;
    placeId: string;
    price: Price;
    quantity: number;
    reporterId: string;
    coords: Coordinates;
    note?: string;
    createdAt?: Date;
    expiresAt?: Date;
    ttlMs?: number;
  }): Discovery {
    if (props.quantity < 1) throw new ValidationError("Quantity must be at least 1");
    if (!props.productId) throw new ValidationError("productId is required");
    if (!props.placeId) throw new ValidationError("placeId is required");
    const createdAt = props.createdAt ?? new Date();
    const expiresAt =
      props.expiresAt ?? new Date(createdAt.getTime() + (props.ttlMs ?? DISCOVERY_DEFAULT_TTL_MS));
    return new Discovery(
      props.id, props.productId, props.placeId, props.price, props.quantity,
      props.reporterId, props.coords, props.note, createdAt, expiresAt,
    );
  }

  isFresh(): boolean {
    return this.expiresAt.getTime() > Date.now();
  }

  ageMs(): number {
    return Date.now() - this.createdAt.getTime();
  }
}
