import { ActionModerationTarget } from "./action-moderation-target.js";
import { NotFoundError } from "@aonde-tem/domain";
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

function makeFlags(openCount: number) {
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
      bulkCalls.push({ targetType, targetId, status });
      return openCount;
    },
  } as unknown as FlagRepository;
  return { repo, bulkCalls };
}

function makeContent() {
  const hidden: string[] = [];
  const blocked: string[] = [];
  const content: ModeratableContentRepository = {
    hideDiscovery: async (id: string) => {
      hidden.push(id);
    },
    blockProduct: async (id: string) => {
      blocked.push(id);
    },
  };
  return { content, hidden, blocked };
}

describe("ActionModerationTarget", () => {
  it("hides a flagged discovery and resolves every open flag on it at once", async () => {
    const { repo, bulkCalls } = makeFlags(3);
    const { content, hidden } = makeContent();

    const result = await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "discovery",
      targetId: "d1",
      action: "hide",
    });

    expect(hidden).toEqual(["d1"]);
    expect(bulkCalls).toEqual([{ targetType: "discovery", targetId: "d1", status: "actioned" }]);
    expect(result.resolved).toBe(3);
  });

  it("blocks a flagged product rather than hiding a discovery", async () => {
    const { repo } = makeFlags(1);
    const { content, hidden, blocked } = makeContent();

    await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "product",
      targetId: "p1",
      action: "hide",
    });

    expect(blocked).toEqual(["p1"]);
    expect(hidden).toEqual([]);
  });

  it("dismisses without touching the content", async () => {
    const { repo, bulkCalls } = makeFlags(2);
    const { content, hidden, blocked } = makeContent();

    await new ActionModerationTarget(repo, content, nullLog).execute({
      targetType: "discovery",
      targetId: "d1",
      action: "dismiss",
    });

    expect(hidden).toEqual([]);
    expect(blocked).toEqual([]);
    expect(bulkCalls).toEqual([{ targetType: "discovery", targetId: "d1", status: "dismissed" }]);
  });

  it("refuses a target with no open flags instead of hiding content for nothing", async () => {
    const { repo } = makeFlags(0);
    const { content, hidden } = makeContent();

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
