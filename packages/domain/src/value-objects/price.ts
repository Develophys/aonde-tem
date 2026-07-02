import { ValidationError } from "../errors/domain-error";
import { PRICE_MAX } from "../consts/price";

export class Price {
  private constructor(public readonly cents: number) {}

  static create(brl: number): Price {
    if (brl <= 0) throw new ValidationError("Price must be greater than zero");
    if (brl > PRICE_MAX) throw new ValidationError(`Price cannot exceed R$${PRICE_MAX}`);
    return new Price(Math.round(brl * 100));
  }

  get formatted(): string {
    const value = this.cents / 100;
    const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      value,
    );
    return formatted.replace(/\u00a0/g, " ");
  }
}
