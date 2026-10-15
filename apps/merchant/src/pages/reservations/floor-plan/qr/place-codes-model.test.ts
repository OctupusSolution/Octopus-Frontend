import { describe, expect, it } from "vitest";
import { ApiError, type PlaceCodeDesign, type PlaceCodeRow } from "@octopus/api-client";
import { createTable, createZone, emptyDoc, type FloorPlanDoc, type FloorTable } from "@/entities/floor-plan";
import { DEFAULT_DESIGN } from "./print";
import {
  chunkGuard,
  classifyLoadError,
  designFromServer,
  designToServer,
  errorKey,
  fetchAllRows,
  joinRows,
  oneAtATime,
  planGenerate,
  planGenerateWithGaps,
  replaceCount,
  revisionOf,
  selectionKey,
  toQrStatus,
  withAllTablesShown,
} from "./place-codes-model";

const row = (over: Partial<PlaceCodeRow>): PlaceCodeRow => ({
  floorId: "f1",
  resourceId: "r1",
  number: "1",
  name: null,
  zoneId: null,
  zone: null,
  capacity: 4,
  status: "active",
  neverPrinted: false,
  blocked: false,
  codeId: "c1",
  version: 1,
  revision: 1,
  generatedAtUtc: "2026-10-15T10:00:00Z",
  hiddenFromCustomers: false,
  ...over,
});
const table = (id: string, number: string, x = 0, y = 0): FloorTable => ({ ...createTable(number, x, y), id });
const problem = (status: number, errorCode: string) => new ApiError(status, { status, errorCode });

describe("toQrStatus", () => {
  it("maps needsReprint to the page's reprint and keeps the rest", () => {
    expect(toQrStatus("needsReprint")).toBe("reprint");
    expect(toQrStatus("active")).toBe("active");
    expect(toQrStatus("notGenerated")).toBe("notGenerated");
    expect(toQrStatus("disabled")).toBe("disabled");
  });
});

describe("joinRows", () => {
  it("joins by resourceId first", () => {
    const m = joinRows([table("r1", "1")], [row({ resourceId: "r1", number: "99" })]);
    expect(m.get("r1")?.number).toBe("99");
  });
  it("falls back to the table number when ids differ", () => {
    const m = joinRows([table("local-7", "7")], [row({ resourceId: "srv-7", number: "7" })]);
    expect(m.get("local-7")?.resourceId).toBe("srv-7");
  });
  it("leaves an unmatched table out instead of throwing", () => {
    const m = joinRows([table("x", "42")], [row({})]);
    expect(m.has("x")).toBe(false);
  });
});

describe("planGenerate", () => {
  // Zone z1 covers x 0..400; table c sits far outside it.
  const zone = { ...createZone("Indoor", "blue", { x: 0, y: 0, w: 400, h: 400 }), id: "z1" };
  const doc: FloorPlanDoc = { ...emptyDoc("Main"), zones: [zone] };
  const tables = [table("a", "1", 20, 20), table("b", "2", 120, 20), table("c", "3", 900, 900)];
  const rows = new Map(
    tables.map((t) => [t.id, row({ resourceId: `srv-${t.id}`, number: t.number, zoneId: t.id === "c" ? null : "srv-z1" })])
  );

  it("sends all when every visible table is chosen", () => {
    expect(planGenerate({ selectedIds: new Set(["a", "b", "c"]), tables, rows, doc })).toEqual([{ mode: "all" }]);
  });
  it("sends one zone, with the server zone id, when the choice is exactly that zone", () => {
    expect(planGenerate({ selectedIds: new Set(["a", "b"]), tables, rows, doc })).toEqual([{ mode: "zone", zoneId: "srv-z1" }]);
  });
  it("sends one per table, with the server resource id, otherwise", () => {
    expect(planGenerate({ selectedIds: new Set(["a", "c"]), tables, rows, doc })).toEqual([
      { mode: "one", resourceId: "srv-a" },
      { mode: "one", resourceId: "srv-c" },
    ]);
  });
  it("sends nothing for an empty choice", () => {
    expect(planGenerate({ selectedIds: new Set(), tables, rows, doc })).toEqual([]);
  });
});

describe("design mapping", () => {
  it("round-trips the server fields and keeps local print prefs", () => {
    const local = { ...DEFAULT_DESIGN, paper: "A5" as const, perPage: 8 };
    const req = designToServer(
      { ...local, template: "sticker", qrSize: "large", numberStyle: "badge", showNumber: false, message: "Hi", showMessage: true, primary: "#112233" },
      4
    );
    expect(req).toEqual({
      expectedVersion: 4,
      templateKey: "sticker",
      sizeKey: "large",
      labelStyle: "badge",
      showLabel: false,
      message: "Hi",
      primaryColour: "#112233",
      logoAssetId: null,
    });
    const server: PlaceCodeDesign = { ...req, version: 5, updatedAtUtc: null, updatedBy: null };
    const back = designFromServer(server, local);
    expect(back.template).toBe("sticker");
    expect(back.paper).toBe("A5");
    expect(back.perPage).toBe(8);
    expect(back.showMessage).toBe(true);
  });
  it("sends a null message when the message is switched off", () => {
    expect(designToServer({ ...DEFAULT_DESIGN, showMessage: false, message: "x" }, 1).message).toBeNull();
  });
  it("cuts the message to the server's 60 characters", () => {
    expect(designToServer({ ...DEFAULT_DESIGN, showMessage: true, message: "x".repeat(80) }, 1).message).toHaveLength(60);
  });
  it("falls back to the local value for an unknown server key", () => {
    const back = designFromServer(
      { templateKey: "weird", sizeKey: "huge", labelStyle: "?", showLabel: true, message: null, primaryColour: null, logoAssetId: null, version: 1, updatedAtUtc: null, updatedBy: null },
      DEFAULT_DESIGN
    );
    expect(back.template).toBe(DEFAULT_DESIGN.template);
    expect(back.qrSize).toBe(DEFAULT_DESIGN.qrSize);
    expect(back.primary).toBe(DEFAULT_DESIGN.primary);
  });
});

describe("fetchAllRows", () => {
  it("pages at the backend's 100-row ceiling until it has totalCount rows", async () => {
    const all = Array.from({ length: 230 }, (_, i) => row({ resourceId: `r${i}`, number: String(i) }));
    const asked: { page: number; pageSize: number }[] = [];
    const out = await fetchAllRows(async (page, pageSize) => {
      asked.push({ page, pageSize });
      const items = all.slice((page - 1) * pageSize, page * pageSize);
      return { items, page, pageSize, totalCount: all.length, counts: null as never, attention: [], lastPrint: null };
    });
    expect(asked).toEqual([
      { page: 1, pageSize: 100 },
      { page: 2, pageSize: 100 },
      { page: 3, pageSize: 100 },
    ]);
    expect(out.items).toHaveLength(230);
  });
  it("stops on an empty page even if totalCount promised more", async () => {
    let calls = 0;
    const out = await fetchAllRows(async (page, pageSize) => {
      calls++;
      return { items: page === 1 ? [row({})] : [], page, pageSize, totalCount: 5, counts: null as never, attention: [], lastPrint: null };
    });
    expect(calls).toBe(2);
    expect(out.items).toHaveLength(1);
  });
});

describe("planGenerate unmatched tables", () => {
  it("reports chosen tables that have no row instead of dropping them silently", () => {
    const doc = emptyDoc("Main");
    const tables = [table("a", "1"), table("b", "2"), table("c", "3")];
    const rows = new Map([["a", row({ resourceId: "srv-a" })]]);
    const plan = planGenerateWithGaps({ selectedIds: new Set(["a", "b"]), tables, rows, doc });
    expect(plan.selections).toEqual([{ mode: "one", resourceId: "srv-a" }]);
    expect(plan.unmatched).toBe(1);
  });
});

describe("replaceCount", () => {
  const rows = [
    row({ resourceId: "r1", codeId: "c1", zoneId: "z1", status: "active" }),
    row({ resourceId: "r2", codeId: "c2", zoneId: "z1", status: "disabled", hiddenFromCustomers: true }),
    row({ resourceId: "r3", codeId: null, zoneId: "z1", status: "notGenerated" }),
    row({ resourceId: "r4", codeId: "c4", zoneId: "z2", status: "needsReprint" }),
  ];
  it("counts every coded place on the floor for all, hidden ones included", () => {
    expect(replaceCount({ mode: "all" }, rows)).toBe(3);
  });
  it("counts the coded places of that server zone", () => {
    expect(replaceCount({ mode: "zone", zoneId: "z1" }, rows)).toBe(2);
  });
  it("counts one for a coded place and zero for an uncoded one", () => {
    expect(replaceCount({ mode: "one", resourceId: "r1" }, rows)).toBe(1);
    expect(replaceCount({ mode: "one", resourceId: "r3" }, rows)).toBe(0);
  });
});

describe("revisionOf", () => {
  it("reads the current revision of a code from the rows or the attention list", () => {
    const rows = [row({ codeId: "c1", revision: 7 })];
    const attention = [{ codeId: "c9", floorId: "f", resourceId: "r9", lastKnownNumber: "9", lastKnownName: null, version: 1, revision: 4, candidate: null }];
    expect(revisionOf("c1", rows, attention)).toBe(7);
    expect(revisionOf("c9", rows, attention)).toBe(4);
    expect(revisionOf("nope", rows, attention)).toBeUndefined();
  });
});

describe("selectionKey", () => {
  it("is the same for equal selections and different otherwise", () => {
    expect(selectionKey({ mode: "one", resourceId: "a" })).toBe(selectionKey({ mode: "one", resourceId: "a" }));
    expect(selectionKey({ mode: "one", resourceId: "a" })).not.toBe(selectionKey({ mode: "one", resourceId: "b" }));
  });
});

describe("oneAtATime", () => {
  it("ignores a second call while the first is still running, then allows the next", async () => {
    let release!: () => void;
    let runs = 0;
    const guarded = oneAtATime(async () => {
      runs++;
      await new Promise<void>((r) => (release = r));
    });
    const first = guarded();
    await guarded(); // a double click: returns at once, does nothing
    expect(runs).toBe(1);
    release();
    await first;
    const third = guarded();
    expect(runs).toBe(2);
    release();
    await third;
  });
  it("frees the guard when the call fails", async () => {
    let runs = 0;
    const guarded = oneAtATime(async () => {
      runs++;
      throw new Error("x");
    });
    await expect(guarded()).rejects.toThrow("x");
    await expect(guarded()).rejects.toThrow("x");
    expect(runs).toBe(2);
  });
});

describe("withAllTablesShown", () => {
  it("draws tables hidden from customers too, without touching the original plan", () => {
    const doc = { ...emptyDoc("Main"), tables: [{ ...table("a", "1"), visible: false }] };
    const shown = withAllTablesShown(doc);
    expect(shown.tables[0].visible).toBe(true);
    expect(doc.tables[0].visible).toBe(false);
  });
});

describe("errors", () => {
  it("treats the backend's entitlement codes as the add-on being off", () => {
    expect(classifyLoadError(problem(403, "entitlements.feature-disabled"))).toBe("notEnabled");
    expect(classifyLoadError(problem(403, "entitlements.module-disabled"))).toBe("notEnabled");
  });
  it("maps known place-code codes to keys and unknown ones to the generic key", () => {
    expect(errorKey(problem(409, "menu.place-code.stale"))).toBe("floorPlan.qr.error.stale");
    expect(errorKey(problem(409, "menu.place-code.relink-target-taken"))).toBe("floorPlan.qr.error.relinkTargetTaken");
    expect(errorKey(problem(429, "rate.limited"))).toBe("floorPlan.qr.error.rateLimited");
    expect(errorKey(problem(500, "boom"))).toBe("floorPlan.qr.error.generic");
    expect(errorKey(new Error("net"))).toBe("floorPlan.qr.error.generic");
  });
  it("classifies load failures", () => {
    expect(classifyLoadError(problem(403, "authorization.forbidden"))).toBe("forbidden");
    expect(classifyLoadError(problem(422, "menu.place-code.floor-not-published"))).toBe("notPublished");
    expect(classifyLoadError(new Error("x"))).toBe("failed");
  });
  it("guards the 500 limit", () => {
    expect(chunkGuard(500)).toBe(true);
    expect(chunkGuard(501)).toBe(false);
  });
});
