import { ListModerationQueue } from "./list-moderation-queue.js";
import type { Logger, ModerationQueueRow, ModerationQueueReader } from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => nullLog,
};

const LATEST = new Date("2026-08-30T12:00:00.000Z");

function row(overrides: Partial<ModerationQueueRow> = {}): ModerationQueueRow {
  return {
    targetType: "discovery",
    targetId: "d1",
    targetName: "Arroz 5kg",
    placeName: "Mercadinho do Zé",
    priceBrl: 24.9,
    flagCount: 1,
    reasons: ["spam"],
    latestComment: null,
    latestReporterEmail: "quem@denunciou.com",
    latestAt: LATEST,
    ...overrides,
  };
}

function makeReader(rows: ModerationQueueRow[]) {
  const calls: (number | undefined)[] = [];
  const reader: ModerationQueueReader = {
    findOpenGroupedByTarget: async (limit?: number) => {
      calls.push(limit);
      return rows;
    },
  };
  return { reader, calls };
}

describe("ListModerationQueue", () => {
  it("describes a flagged discovery with its place and price", async () => {
    const { reader } = makeReader([row()]);

    const entry = (await new ListModerationQueue(reader, nullLog).execute())[0]!;

    expect(entry.targetName).toBe("Arroz 5kg");
    expect(entry.targetContext).toBe("Mercadinho do Zé · R$ 24,90");
  });

  it("gives a flagged product no context line — it has no place or price", async () => {
    const { reader } = makeReader([
      row({ targetType: "product", targetId: "p1", placeName: null, priceBrl: null }),
    ]);

    const entry = (await new ListModerationQueue(reader, nullLog).execute())[0]!;

    expect(entry.targetContext).toBeNull();
  });

  it("keeps a deleted target's null name instead of dropping the entry", async () => {
    const { reader } = makeReader([row({ targetName: null, placeName: null, priceBrl: null })]);

    const entries = await new ListModerationQueue(reader, nullLog).execute();

    expect(entries).toHaveLength(1);
    expect(entries[0]!.targetName).toBeNull();
    expect(entries[0]!.targetContext).toBeNull();
  });

  it("passes every grouped field through, including the flag count and reasons", async () => {
    const { reader } = makeReader([
      row({ flagCount: 3, reasons: ["illegal", "spam"], latestComment: "produto proibido" }),
    ]);

    const entry = (await new ListModerationQueue(reader, nullLog).execute())[0]!;

    expect(entry.flagCount).toBe(3);
    expect(entry.reasons).toEqual(["illegal", "spam"]);
    expect(entry.latestComment).toBe("produto proibido");
    expect(entry.latestReporterEmail).toBe("quem@denunciou.com");
    expect(entry.latestAt).toEqual(LATEST);
  });

  it("caps the queue at 100 targets", async () => {
    const { reader, calls } = makeReader([]);

    await new ListModerationQueue(reader, nullLog).execute();

    expect(calls).toEqual([100]);
  });
});
