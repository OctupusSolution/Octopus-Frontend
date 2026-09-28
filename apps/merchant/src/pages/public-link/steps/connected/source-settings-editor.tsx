// Display settings of a bound section (`sourceSettings`), edited generically: declared settings
// (the source's `settingsSchema`) get typed editors the way fields-inspector.tsx renders catalogue
// fields; every other stored key keeps its value and gets an editor inferred from it; new keys can
// be added. The owning capability validates them on save (`publiclink.source.settings-invalid`
// carries its reason). See _shared/source-settings.ts for the mapping.
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input, Select, Textarea } from "@ui/primitives";
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
import { Switch } from "../../ui/switch";
import { FieldRow } from "../customize/controls";
import { SMALL_BUTTON } from "./common";

/** A raw JSON value, parsed on blur; malformed text is flagged and not applied. */
function JsonInput({ value, onChange, label }: { value: unknown; onChange: (v: unknown) => void; label: string }) {
  const tx = usePlText();
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [bad, setBad] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <Textarea
        aria-label={label}
        dir="ltr"
        rows={3}
        className="font-mono text-[11.5px]"
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
      {bad && <span className="text-[11px] text-[#DC2626]">{tx("pl.settings.badJson")}</span>}
    </div>
  );
}

function TypedInput({ type, value, onChange, label }: { type: SettingValueType; value: unknown; onChange: (v: unknown) => void; label: string }) {
  if (type === "toggle") return <Switch checked={value === true} onChange={() => onChange(!(value === true))} label={label} />;
  if (type === "number")
    return <Input type="number" aria-label={label} value={typeof value === "number" ? String(value) : ""} onChange={(e) => onChange(coerceSettingInput("number", e.target.value))} />;
  if (type === "json") return <JsonInput value={value} onChange={onChange} label={label} />;
  return <Input aria-label={label} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(coerceSettingInput("text", e.target.value) ?? "")} />;
}

function DeclaredSetting({ field, settings, onChange, lang }: { field: SourceSettingDefinition; settings: SettingsObject; onChange: (v: unknown) => void; lang: string }) {
  const label = humanizeKey(field.labelKey || field.key) + (field.required ? " *" : "");
  const value = schemaValue(field, settings);
  const kind = String(field.kind).toLowerCase();
  let control;
  if (kind === "choice") {
    control = (
      <Select aria-label={label} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">—</option>
        {(field.choices ?? []).map((c) => (
          <option key={c.key} value={c.key}>
            {humanizeKey(c.labelKey || c.key)}
          </option>
        ))}
      </Select>
    );
  } else if (kind === "localizedtext") {
    const map = isSettingsObject(value) ? (value as Record<string, string>) : {};
    control = (
      <Input
        aria-label={label}
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
      <Input
        type="number"
        aria-label={label}
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
      <Input
        aria-label={label}
        maxLength={field.maxLength ?? undefined}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(coerceSettingInput("text", e.target.value))}
      />
    );
  }
  return <FieldRow label={label}>{control}</FieldRow>;
}

export function SourceSettingsEditor({
  schema,
  settings,
  raw,
  onSettings,
  onRaw,
  lang,
}: {
  schema: readonly SourceSettingDefinition[];
  /** null: the stored value is not an object and is edited as raw JSON. */
  settings: SettingsObject | null;
  raw: string;
  onSettings: (next: SettingsObject) => void;
  onRaw: (text: string) => void;
  lang: string;
}) {
  const tx = usePlText();
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState<SettingValueType>("text");

  if (settings === null) {
    return (
      <FieldRow label={tx("pl.settings.raw")}>
        <Textarea dir="ltr" rows={4} className="font-mono text-[11.5px]" value={raw} onChange={(e) => onRaw(e.target.value)} />
      </FieldRow>
    );
  }

  const extras = extraSettingKeys(settings, schema);
  const canAdd = validSettingKey(newKey, settings) && !schema.some((f) => f.key === newKey.trim());

  return (
    <div className="flex flex-col gap-3">
      {schema.length === 0 && extras.length === 0 && <p className="text-[11.5px] text-[var(--octo-text-muted)]">{tx("pl.settings.none")}</p>}
      {schema.map((field) => (
        <DeclaredSetting key={field.key} field={field} settings={settings} lang={lang} onChange={(v) => onSettings(withSetting(settings, field.key, v))} />
      ))}
      {extras.map((key) => {
        const type = inferSettingType(settings[key]);
        return (
          <div key={key} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <FieldRow label={humanizeKey(key)}>
                <TypedInput type={type} value={settings[key]} label={key} onChange={(v) => onSettings(withSetting(settings, key, v))} />
              </FieldRow>
            </div>
            <button
              type="button"
              aria-label={`${tx("pl.common.remove")} — ${key}`}
              onClick={() => onSettings(withSetting(settings, key, undefined))}
              className="mt-6 rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-end gap-2 border-t border-dashed border-[var(--octo-divider)] pt-2.5">
        <div className="min-w-[120px] flex-1">
          <Input dir="ltr" aria-label={tx("pl.settings.key")} placeholder={tx("pl.settings.key")} value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        </div>
        <div className="w-[110px]">
          <Select aria-label={tx("pl.settings.type")} value={newType} onChange={(e) => setNewType(e.target.value as SettingValueType)}>
            {(["text", "number", "toggle", "json"] as const).map((t) => (
              <option key={t} value={t}>
                {tx(`pl.settings.type.${t}`)}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="button"
          className={SMALL_BUTTON}
          disabled={!canAdd}
          onClick={() => {
            onSettings(withSetting(settings, newKey.trim(), emptySettingValue(newType)));
            setNewKey("");
          }}
        >
          <Plus size={13} />
          {tx("pl.settings.add")}
        </button>
      </div>
    </div>
  );
}
