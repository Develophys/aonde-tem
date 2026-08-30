/**
 * The two things moderation can do to content. Deliberately not a generic
 * `hide(targetType, id)`: the two operations are different columns on different
 * tables, and collapsing them would hide that from the caller.
 */
export interface ModeratableContentRepository {
  /** Sets `hiddenAt`, removing the discovery from every read endpoint. */
  hideDiscovery(id: string): Promise<void>;
  /** Sets `status = 'blocked'`, removing the product and its discoveries from reads. */
  blockProduct(id: string): Promise<void>;
}
