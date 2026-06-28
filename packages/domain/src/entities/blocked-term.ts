export type BlockedTermAction = "block" | "review";

export class BlockedTerm {
  private constructor(
    public readonly id: string,
    public readonly pattern: string,
    public readonly action: BlockedTermAction,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    pattern: string;
    action: BlockedTermAction;
    createdAt?: Date;
  }): BlockedTerm {
    return new BlockedTerm(props.id, props.pattern.trim().toLowerCase(), props.action, props.createdAt ?? new Date());
  }

  matches(name: string): boolean {
    return name.toLowerCase().includes(this.pattern);
  }
}
