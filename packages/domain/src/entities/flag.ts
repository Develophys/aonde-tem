import { ValidationError } from "../errors/domain-error.js";
import { VALID_FLAG_REASONS } from "../consts/flag.js";

export type FlagTargetType = "product" | "discovery";
export type FlagReason = "illegal" | "inappropriate" | "spam" | "wrong_info" | "other";
export type FlagStatus = "open" | "actioned" | "dismissed";

export class Flag {
  private constructor(
    public readonly id: string,
    public readonly targetType: FlagTargetType,
    public readonly targetId: string,
    public readonly reason: FlagReason,
    public readonly reporterId: string,
    public readonly comment: string | undefined,
    public readonly status: FlagStatus,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    targetType: FlagTargetType;
    targetId: string;
    reason: FlagReason;
    reporterId: string;
    comment?: string;
    status?: FlagStatus;
    createdAt?: Date;
  }): Flag {
    if (!VALID_FLAG_REASONS.includes(props.reason)) {
      throw new ValidationError(`Invalid flag reason: ${props.reason}`);
    }
    return new Flag(
      props.id, props.targetType, props.targetId, props.reason,
      props.reporterId, props.comment, props.status ?? "open",
      props.createdAt ?? new Date(),
    );
  }
}
