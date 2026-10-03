// Display settings of a bound section (`sourceSettings`), edited generically: declared settings
// (the source's `settingsSchema`) get typed editors the way fields-inspector.tsx renders catalogue
// fields; every other stored key keeps its value and gets an editor inferred from it; new keys can
// be added. The owning capability validates them on save (`publiclink.source.settings-invalid`
// carries its reason); what the schema itself declares (required, max length, number bounds) is
// checked here first. See _shared/source-settings.ts for the mapping.
import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { SourceSettingDefinition } from "@octopus/api-client";
import { withText } from "@/entities/site-draft";
import {
  coerceSettingInput,
  emptySettingValue,
  extraSettingKeys,
  inferSettingType,
  isSettingsObject,
  schemaValue,
  validSettingKey,
  withSetting,
  type SettingsObject,
  type SettingValueType,
} from "../../_shared/source-settings";
import { humanizeKey, usePlText } from "../../_shared/texts";
import { firstFailure, rules, useValidation, type RuleFailure } from "../../_shared/validation";
import { PlFieldError, PlInput, PlSelect, PlTextarea, plText } from "../../ui/kit";
import { Switch } from "../../ui/switch";
import { FieldRow } from "../customize/controls";
import { SMALL_BUTTON } from "./common";

const MONO = "font-mono !text-[12px]";
const REMOVE_BUTTON =
  "grid h-6 w-6 shrink-0 place-items-center rounded text-[var(--pl-text-3)] transition-colors hover:text-[var(--pl-error)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";

/** What a declared setting's value breaks in its own schema entry, or null. */
export function settingFailure(field: SourceSettingDefinition, settings: SettingsObject, lang: string): RuleFailure | null {
  const value = schemaValue(field, settings);
  const kind = String(field.kind).toLowerCase();
  const required = field.required === true;
  const max = field.maxLength ?? undefined;
  if (kind === "toggle") return null;
  if (kind === "choice") return required && !(typeof value === "string" && value) ? { key: "pl.v.required" } : null;
  if (kind === "number") {
    if (typeof value !== "number") return required ? { key: "pl.v.required" } : null;
    if (field.min != null && value < field.min) return { key: "pl.v.min", vars: { min: field.min } };
    if (field.max != null && value > field.max) return { key: "pl.v.max", vars: { max: field.max } };
    return null;
  }
  if (kind === "localizedtext") {
    const map = isSettingsObject(value) ? (value as Record<string, string>) : {};
    // Required means "has text in some language"; the length cap is per language.
    if (required && !Object.values(map).some((text) => typeof text === "string" && text.trim())) return { key: "pl.v.required" };
    return max ? firstFailure(map[lang] ?? "", [rules.maxLength(max)]) : null;
  }
  const text = typeof value === "string" ? value : "";
  return firstFailure(text, [...(required ? [rules.required()] : []), ...(max ? [rules.maxLength(max)] : [])]);
}

/** Whether any declared setting is invalid — Save is refused while one is. */
export function settingsInvalid(schema: readonly SourceSettingDefinition[], settings: SettingsObject | null, lang: string): boolean {
  return settings !== null && schema.some((field) => settingFailure(field, settings, lang) !== null);
}

/** A raw JSON value, parsed on blur; malformed text is flagged and not applied. */
function JsonInput({ value, onChange, label }: { value: unknown; onChange: (v: unknown) => void; label: string }) {
  const tx = usePlText();
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [bad, setBad] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <PlTextarea
        aria-label={label}
        dir="ltr"
        rows={3}
        invalid={bad}
        className={MONO}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          try {
            onChange(coerceSettingInput("json", text) ?? null);
            setBad(false);
          } catch {
            setBad(true);
          }
        }}
      />
      {bad && <PlFieldError>{tx("pl.settings.badJson")}</PlFieldError>}
    </div>
  );
}

function TypedInput({ type, value, onChange, label }: { type: SettingValueType; value: unknown; onChange: (v: unknown) => void; label: string }) {
  if (type === "toggle") return <Switch checked={value === true} onChange={() => onChange(!(value === true))} label={label} />;
  if (type === "number")
    return (
      <PlInput
        type="number"
        inputMode="decimal"
        aria-label={label}
        value={typeof value === "number" ? String(value) : ""}
        onChange={(e) => onChange(coerceSettingInput("number", e.target.value))}
      />
    );
  if (type === "json") return <JsonInput value={value} onChange={onChange} label={label} />;
  return <PlInput aria-label={label} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(coerceSettingInput("text", e.target.value) ?? "")} />;
}

function DeclaredSetting({
  field,
  settings,
  onChange,
  lang,
  showErrors,
}: {
  field: SourceSettingDefinition;
  settings: SettingsObject;
  onChange: (v: unknown) => void;
  lang: string;
  showErrors: boolean;
}) {
  const { message } = useValidation();
  // Its error shows once the field was left, or once Save was pressed.
  const [left, setLeft] = useState(false);
  const label = humanizeKey(field.labelKey || field.key);
  const value = schemaValue(field, settings);
  const kind = String(field.kind).toLowerCase();
  const error = left || showErrors ? message(settingFailure(field, settings, lang)) : undefined;
  const invalid = Boolean(error);
  const onBlur = () => setLeft(true);
  let control;
  if (kind === "choice") {
    control = (
      <PlSelect aria-label={label} invalid={invalid} onBlur={onBlur} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">—</option>
        {(field.choices ?? []).map((c) => (
          <option key={c.key} value={c.key}>
            {humanizeKey(c.labelKey || c.key)}
          </option>
        ))}
      </PlSelect>
    );
  } else if (kind === "localizedtext") {
    const map = isSettingsObject(value) ? (value as Record<string, string>) : {};
    control = (
      <PlInput
        aria-label={label}
        invalid={invalid}
        onBlur={onBlur}
        maxLength={field.maxLength ?? undefined}
        value={map[lang] ?? ""}
        onChange={(e) => {
          const next = withText(map, lang, e.target.value);
          onChange(Object.keys(next).length ? next : undefined);
        }}
      />
    );
  } else if (kind === "number") {
    control = (
      <PlInput
        type="number"
        inputMode="decimal"
        aria-label={label}
        invalid={invalid}
        onBlur={onBlur}
        min={field.min ?? undefined}
        max={field.max ?? undefined}
        step={field.step ?? undefined}
        value={typeof value === "number" ? String(value) : ""}
        onChange={(e) => onChange(coerceSettingInput("number", e.target.value))}
      />
    );
  } else if (kind === "toggle") {
    control = <Switch checked={value === true} onChange={() => onChange(!(value === true))} label={label} />;
  } else {
    control = (
      <PlInput
        aria-label={label}
        invalid={invalid}
        onBlur={onBlur}
        maxLength={field.maxLength ?? undefined}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(coerceSettingInput("text", e.target.value))}
      />
    );
  }
  return (
    <FieldRow label={label} required={field.required === true} error={error}>
      {control}
    </FieldRow>
  );
}

export function SourceSettingsEditor({
  schema,
  settings,
  raw,
  onSettings,
  onRaw,
  lang,
  showErrors = false,
  rawInvalid = false,
}: {
  schema: readonly SourceSettingDefinition[];
  /** null: the stored value is not an object and is edited as raw JSON. */
  settings: SettingsObject | null;
  raw: string;
  onSettings: (next: SettingsObject) => void;
  onRaw: (text: string) => void;
  lang: string;
  /** Save was pressed: every declared setting reports its error. */
  showErrors?: boolean;
  /** The raw JSON did not parse on the last Save. */
  rawInvalid?: boolean;
}) {
  const tx = usePlText();
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState<SettingValueType>("text");

  if (settings === null) {
    return (
      <FieldRow label={tx("pl.settings.raw")}>
        <PlTextarea aria-label={tx("pl.settings.raw")} dir="ltr" rows={4} invalid={rawInvalid} className={MONO} value={raw} onChange={(e) => onRaw(e.target.value)} />
      </FieldRow>
    );
  }

  const extras = extraSettingKeys(settings, schema);
  const key = newKey.trim();
  const taken = key !== "" && (key in settings || schema.some((f) => f.key === key));
  const canAdd = validSettingKey(newKey, settings) && !taken;
  // A name is judged as soon as something is typed; an empty box is not an error.
  const keyError = key === "" || canAdd ? undefined : tx(taken ? "pl.v.duplicate" : "pl.customize.settingKeyInvalid");

  return (
    <div className="flex flex-col gap-4">
      {schema.length === 0 && extras.length === 0 && <p className={plText.hint}>{tx("pl.settings.none")}</p>}
      {schema.map((field) => (
        <DeclaredSetting
          key={field.key}
          field={field}
          settings={settings}
          lang={lang}
          showErrors={showErrors}
          onChange={(v) => onSettings(withSetting(settings, field.key, v))}
        />
      ))}
      {extras.map((extra) => {
        const type = inferSettingType(settings[extra]);
        return (
          <FieldRow
            key={extra}
            label={humanizeKey(extra)}
            action={
              <button type="button" aria-label={`${tx("pl.common.remove")} — ${extra}`} onClick={() => onSettings(withSetting(settings, extra, undefined))} className={REMOVE_BUTTON}>
                <X size={16} />
              </button>
            }
          >
            <TypedInput type={type} value={settings[extra]} label={extra} onChange={(v) => onSettings(withSetting(settings, extra, v))} />
          </FieldRow>
        );
      })}
      <div className="flex flex-col gap-2 border-t border-dashed border-[var(--pl-g300)] pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[120px] flex-1">
            <PlInput
              dir="ltr"
              aria-label={tx("pl.settings.key")}
              placeholder={tx("pl.settings.key")}
              invalid={Boolean(keyError)}
              maxLength={64}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div className="w-[120px]">
            <PlSelect aria-label={tx("pl.settings.type")} value={newType} onChange={(e) => setNewType(e.target.value as SettingValueType)}>
              {(["text", "number", "toggle", "json"] as const).map((t) => (
                <option key={t} value={t}>
                  {tx(`pl.settings.type.${t}`)}
                </option>
              ))}
            </PlSelect>
          </div>
          <button
            type="button"
            className={SMALL_BUTTON + " h-10"}
            disabled={!canAdd}
            onClick={() => {
              onSettings(withSetting(settings, key, emptySettingValue(newType)));
              setNewKey("");
            }}
          >
            <Plus size={14} />
            {tx("pl.settings.add")}
          </button>
        </div>
        <PlFieldError>{keyError}</PlFieldError>
      </div>
    </div>
  );
}
