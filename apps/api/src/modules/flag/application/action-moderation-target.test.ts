import { ActionModerationTarget } from "./action-moderation-target.js";
import { ConflictError, NotFoundError } from "@aonde-tem/domain";
import type {
  FlagRepository,
  FlagStatus,
  FlagTargetType,
  Logger,
  ModeratableContentRepository,
} from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => nullLog,
};

function makeFlags(openCount: number, order: string[]) {
  const bulkCalls: { targetType: FlagTargetType; targetId: string; status: FlagStatus }[] = [];
  const repo = {
    findById: async () => null,
    findOpen: async () => [],
    save: async () => {},
    updateStatus: async () => {},
    countOpenByTarget: async () => openCount,
    updateStatusByTarget: async (
      targetType: FlagTargetType,
      targetId: string,
      status: FlagStatus,
    ) => {
      order.push("flags");
      bulkCalls.push({ targetType, targetId, status });
      return openCount;
    },
  } as unknown as FlagRepository;
  return { repo, bulkCalls };
}

function makeContent(order: string[]) {
  const hidden: string[] = [];
  const blocked: string[] = [];
  const content: ModeratableContentRepository = {
    hideDiscovery: async (id: string) => {
      order.push("content");
      hidden.push(id);
    },
    blockProduct: async (id: string) => {
      order.push("content");
      blocked.push(id);
    },
  };
  return { content, hidden, blocked };
}

describe("ActionModerationTarget", () => {
  it("hides a flagged discovery and resolves every open flag on it at once", async () => {
    const order: string[] = [];
    const { repo, bulkCalls } = makeFlags(3, order);
    const { content, hidden } = makeContent(order);

    const result = await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "discovery",
      targetId: "d1",
      action: "hide",
    });

    expect(hidden).toEqual(["d1"]);
    expect(bulkCalls).toEqual([{ targetType: "discovery", targetId: "d1", status: "actioned" }]);
    expect(result.resolved).toBe(3);
    // The content mutation must land before the flags are resolved: if execute() resolved the
    // flags first and then failed to hide the content, the queue would show the flag as handled
    // while the content stayed up. See action-moderation-target.ts's doc comment.
    expect(order).toEqual(["content", "flags"]);
  });

  it("blocks a flagged product rather than hiding a discovery", async () => {
    const order: string[] = [];
    const { repo } = makeFlags(1, order);
    const { content, hidden, blocked } = makeContent(order);

    await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "product",
      targetId: "p1",
      action: "hide",
    });

    expect(blocked).toEqual(["p1"]);
    expect(hidden).toEqual([]);
    expect(order).toEqual(["content", "flags"]);
  });

  it("dismisses without touching the content", async () => {
    const order: string[] = [];
    const { repo, bulkCalls } = makeFlags(2, order);
    const { content, hidden, blocked } = makeContent(order);

    await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "discovery",
      targetId: "d1",
      action: "dismiss",
    });

    expect(hidden).toEqual([]);
    expect(blocked).toEqual([]);
    expect(bulkCalls).toEqual([{ targetType: "discovery", targetId: "d1", status: "dismissed" }]);
  });

  it("loses the race when another admin resolves the target first", async () => {
    const order: string[] = [];
    // countOpenByTarget still sees 3 open flags — that check ran before the race was
    // lost — but by the time updateStatusByTarget runs, another admin's action has
    // already flipped every one of them out of "open", so the bulk update matches
    // nothing and reports 0 resolved.
    const repo = {
      findById: async () => null,
      findOpen: async () => [],
      save: async () => {},
      updateStatus: async () => {},
      countOpenByTarget: async () => 3,
      updateStatusByTarget: async () => {
        order.push("flags");
        return 0;
      },
    } as unknown as FlagRepository;
    const { content, hidden } = makeContent(order);

    await expect(
      new ActionModerationTarget(repo, content, nullLog).execute({
        targetType: "discovery",
        targetId: "d1",
        action: "hide",
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    // The race is lost *after* the content call: by the time updateStatusByTarget
    // discovers the conflict, hideDiscovery has already run against the (now doubly-
    // actioned) content. That's the point of throwing here rather than swallowing the
    // 0 — the caller finds out their action landed on content someone else already
    // handled, instead of being told "ok, resolved: 0" and believing they cleared it.
    expect(order).toEqual(["content", "flags"]);
    expect(hidden).toEqual(["d1"]);
  });

  it("refuses a target with no open flags instead of hiding content for nothing", async () => {
    const order: string[] = [];
    const { repo } = makeFlags(0, order);
    const { content, hidden } = makeContent(order);

    await expect(
      new ActionModerationTarget(repo, content, nullLog).execute({
        targetType: "discovery",
        targetId: "gone",
        action: "hide",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(hidden).toEqual([]);
  });
});
