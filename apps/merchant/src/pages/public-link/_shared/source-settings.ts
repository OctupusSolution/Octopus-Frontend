// A bound section's `sourceSettings`: opaque JSON the owning capability validates
// (`IConnectableContentProvider.ValidateSettingsAsync`). Public Link never learns its shape, so the
// builder edits it generically:
//   - when the source declares a schema (`descriptor.settingsSchema`), each declared key gets a typed
//     editor (text, per-language text, number, on/off, choice) with its default;
//   - every other key present in the stored object keeps its value and gets an editor inferred from
//     that value (text, number, on/off, or raw JSON for objects/arrays/null), so nothing is dropped;
//   - a stored value that is not an object at all is edited as raw JSON.
// The section write replaces the settings wholesale (an omitted value clears them on the server), so
// the save always sends the full object, and sends `null` when nothing is set.
import type { ContentSourceResponse, SourceSettingDefinition, SourceSettingsJson } from "@octopus/api-client";

export type SettingValueType = "text" | "number" | "toggle" | "json";
export type SettingsObject = Record<string, unknown>;

export function isSettingsObject(value: unknown): value is SettingsObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** The schema a source declares, if any (the current backend declares none). */
export function readSettingsSchema(source: ContentSourceResponse | undefined): SourceSettingDefinition[] {
  const schema = source?.descriptor?.settingsSchema;
  return Array.isArray(schema) ? schema.filter((f) => f && typeof f.key === "string" && f.key) : [];
}

/** How a stored value is edited when no schema names it. */
export function inferSettingType(value: unknown): SettingValueType {
  if (typeof value === "string") return "text";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "toggle";
  return "json";
}

/** The editor's starting state: the stored object, or raw JSON text for anything that is not an object. */
export function settingsEditorState(settings: SourceSettingsJson | null | undefined): { object: SettingsObject | null; raw: string } {
  if (settings === null || settings === undefined) return { object: {}, raw: "" };
  if (isSettingsObject(settings)) return { object: { ...settings }, raw: JSON.stringify(settings, null, 2) };
  return { object: null, raw: JSON.stringify(settings, null, 2) };
}

/** A typed input's value as JSON. Blank text/number clears the key (`undefined`); raw JSON throws when malformed. */
export function coerceSettingInput(type: SettingValueType, input: string | boolean): unknown {
  switch (type) {
    case "toggle":
      return input === true || input === "true";
    case "number": {
      const text = String(input).trim();
      if (!text) return undefined;
      const n = Number(text);
      return Number.isFinite(n) ? n : undefined;
    }
    case "json": {
      const text = String(input).trim();
      return text ? JSON.parse(text) : undefined;
    }
    default: {
      const text = String(input);
      return text.trim() ? text : undefined;
    }
  }
}

/** Sets or (for `undefined`) removes one key. */
export function withSetting(settings: SettingsObject, key: string, value: unknown): SettingsObject {
  const next = { ...settings };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

/** A declared setting's current value (the stored one, else its default). */
export function schemaValue(field: SourceSettingDefinition, settings: SettingsObject): unknown {
  return field.key in settings ? settings[field.key] : field.default;
}

/** Keys the schema does not declare, in stored order. */
export function extraSettingKeys(settings: SettingsObject, schema: readonly SourceSettingDefinition[]): string[] {
  const declared = new Set(schema.map((f) => f.key));
  return Object.keys(settings).filter((k) => !declared.has(k));
}

/** A new key must be non-blank, unique, and a plain identifier (letters, digits, `-`, `_`, `.`). */
export function validSettingKey(key: string, settings: SettingsObject): boolean {
  const k = key.trim();
  return /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(k) && !(k in settings);
}

/** A starting value for a newly added key of a given type. */
export function emptySettingValue(type: SettingValueType): unknown {
  switch (type) {
    case "number":
      return 0;
    case "toggle":
      return false;
    case "json":
      return {};
    default:
      return "";
  }
}

/** What the section write sends: the object (undefined values dropped), or null when nothing is set. */
export function settingsForSave(settings: SettingsObject | null, raw: string): SourceSettingsJson | null {
  if (settings === null) {
    const text = raw.trim();
    return text ? (JSON.parse(text) as SourceSettingsJson) : null;
  }
  const clean: SettingsObject = {};
  for (const [k, v] of Object.entries(settings)) if (v !== undefined) clean[k] = v;
  return Object.keys(clean).length ? clean : null;
}
