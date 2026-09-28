import { describe, expect, it } from "vitest";
import type { ContentSourceResponse } from "@octopus/api-client";
import {
  coerceSettingInput,
  extraSettingKeys,
  inferSettingType,
  readSettingsSchema,
  schemaValue,
  settingsEditorState,
  settingsForSave,
  validSettingKey,
  withSetting,
} from "./source-settings";

const source = (settingsSchema?: unknown): ContentSourceResponse =>
  ({
    sourceKey: "menu",
    descriptor: { displayNameKey: "sources.menu.name", iconKey: "utensils", placements: ["Page", "Section"], maxPagesPerContentKey: 1, suggestedPathSegment: "menu", settingsSchema },
    items: [],
  }) as ContentSourceResponse;

describe("source settings mapping", () => {
  it("round-trips a stored object untouched, including keys nothing declares", () => {
    const stored = { layout: "grid", columns: 3, showPrices: true, extra: { nested: [1, 2] }, empty: null };
    const { object } = settingsEditorState(stored);
    expect(settingsForSave(object, "")).toEqual(stored);
    expect(Object.keys(object!).map((k) => inferSettingType(object![k]))).toEqual(["text", "number", "toggle", "json", "json"]);
  });

  it("sends null when nothing is set, and keeps a non-object value as raw JSON", () => {
    expect(settingsEditorState(null)).toEqual({ object: {}, raw: "" });
    expect(settingsForSave({}, "")).toBeNull();
    expect(settingsForSave(withSetting({ a: 1 }, "a", undefined), "")).toBeNull();
    const raw = settingsEditorState([1, "two"]);
    expect(raw.object).toBeNull();
    expect(settingsForSave(raw.object, raw.raw)).toEqual([1, "two"]);
    expect(() => settingsForSave(null, "{nope")).toThrow();
  });

  it("coerces typed inputs; blank text or number clears the key", () => {
    expect(coerceSettingInput("text", "Hi")).toBe("Hi");
    expect(coerceSettingInput("text", "  ")).toBeUndefined();
    expect(coerceSettingInput("number", "4.5")).toBe(4.5);
    expect(coerceSettingInput("number", "")).toBeUndefined();
    expect(coerceSettingInput("number", "abc")).toBeUndefined();
    expect(coerceSettingInput("toggle", true)).toBe(true);
    expect(coerceSettingInput("json", '{"a":[1]}')).toEqual({ a: [1] });
  });

  it("reads a declared schema, defaults, and separates undeclared keys", () => {
    expect(readSettingsSchema(source())).toEqual([]);
    const schema = readSettingsSchema(source([{ key: "layout", kind: "choice", choices: [{ key: "grid", labelKey: "grid" }], default: "list" }, { kind: "text" }]));
    expect(schema.map((f) => f.key)).toEqual(["layout"]);
    expect(schemaValue(schema[0], {})).toBe("list");
    expect(schemaValue(schema[0], { layout: "grid" })).toBe("grid");
    expect(extraSettingKeys({ layout: "grid", other: 1 }, schema)).toEqual(["other"]);
  });

  it("validates new keys", () => {
    expect(validSettingKey("showPrices", {})).toBe(true);
    expect(validSettingKey("showPrices", { showPrices: true })).toBe(false);
    expect(validSettingKey("1bad", {})).toBe(false);
    expect(validSettingKey("", {})).toBe(false);
  });
});
