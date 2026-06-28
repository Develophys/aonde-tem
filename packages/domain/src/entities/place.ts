// packages/domain/src/entities/place.ts
import { Coordinates } from "../value-objects/coordinates";
import { ValidationError } from "../errors/domain-error";

export class Place {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly coords: Coordinates,
    public readonly address: string | undefined,
    public readonly createdById: string | undefined,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    coords: Coordinates;
    address?: string;
    createdById?: string;
    createdAt?: Date;
  }): Place {
    if (props.name.trim().length < 2) {
      throw new ValidationError("Place name must be at least 2 characters");
    }
    return new Place(
      props.id,
      props.name.trim(),
      props.coords,
      props.address,
      props.createdById,
      props.createdAt ?? new Date(),
    );
  }
}
