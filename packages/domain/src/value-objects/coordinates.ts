import { ValidationError } from "../errors/domain-error";

/** Geographic point (WGS84). Self-validating value object. */
export class Coordinates {
  private constructor(
    public readonly lat: number,
    public readonly lng: number,
  ) {}

  static create(lat: number, lng: number): Coordinates {
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      throw new ValidationError("Latitude must be between -90 and 90", { lat });
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      throw new ValidationError("Longitude must be between -180 and 180", { lng });
    }
    return new Coordinates(lat, lng);
  }

  equals(other: Coordinates): boolean {
    return this.lat === other.lat && this.lng === other.lng;
  }
}
