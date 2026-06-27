import { Coordinates } from "../value-objects/coordinates.js";
import { ValidationError } from "../errors/domain-error.js";

export interface PlaceProps {
  id: string;
  name: string;
  category: string;
  coords: Coordinates;
  address?: string;
}

/** A place users can discover on the map. Enforces its own invariants. */
export class Place {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly category: string,
    public readonly coords: Coordinates,
    public readonly address?: string,
  ) {}

  static create(props: {
    id: string;
    name: string;
    category: string;
    coords: Coordinates;
    address?: string;
  }): Place {
    if (props.name.trim().length < 2) {
      throw new ValidationError("Place name must be at least 2 characters");
    }
    if (props.category.trim().length === 0) {
      throw new ValidationError("Place category is required");
    }
    return new Place(props.id, props.name.trim(), props.category.trim(), props.coords, props.address);
  }
}
