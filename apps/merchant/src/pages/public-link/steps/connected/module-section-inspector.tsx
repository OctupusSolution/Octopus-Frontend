// The inspector for a bound (content-source) section while connected — the real-data counterpart
// of the local builder's Menu and Reservations inspectors (steps/customize/*), which only exist
// without a business session. Everything here comes from the server:
//   - which item the section shows (GET /content-sources items of its source; a non-primary
//     section can be switched to another item — remove + add at the same place, since no endpoint
//     rebinds in place; a module page's primary section stays bound to its page's content);
//   - whether the content is available right now (`sourceState`), how big it is, where else the site
//     uses it (`usage`);
//   - whether the section is shown (PUT …/sections/{id}/enabled; a primary section is always on);
//   - its display settings (`sourceSettings`, see source-settings-editor.tsx) and presentation
//     (style, devices, anchor), saved with PUT …/sections/{id}.
// Sources the backend does not register (offers, events, loyalty, waitlist) have no bound sections,
// so nothing of theirs appears while connected.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CalendarClock, ExternalLink, Link2 } from "lucide-react";
import { Badge, Button, Select } from "@ui/primitives";
import type { DeviceClass, PageDraftResponse, SectionDraftResponse, SectionStyle } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { stableJson, type PublicLinkSync } from "@/entities/site-draft";
import { readSettingsSchema, settingsEditorState, settingsForSave, type SettingsObject } from "../../_shared/source-settings";
import { usePlText } from "../../_shared/texts";
import { FieldRow, ToggleRow } from "../customize/controls";
import { useBusy, usePreviewEdit } from "./common";
import { StyleEditor } from "./fields-inspector";
import { SourceSettingsEditor } from "./source-settings-editor";

const MANAGE_ROUTE: Record<string, string> = { menu: "/menu", reservation: "/reservations" };
const SOURCE_ICON: Record<string, typeof Link2> = { menu: BookOpen, reservation: CalendarClock };

export function ModuleSectionInspector({
  sync,
  page,
  section,
  label,
  onRebound,
}: {
  sync: PublicLinkSync;
  page: PageDraftResponse;
  section: SectionDraftResponse;
  /** The source's display name. */
  label: string;
  /** The rebound section's new id (rebinding replaces the section). */
  onRebound: (sectionId: string) => void;
}) {
  const tx = usePlText();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const { act, busy } = useBusy();
  const sourceKey = section.source?.sourceKey ?? section.type;
  const source = sync.server?.sources.find((s) => s.sourceKey === sourceKey);
  const items = source?.items ?? [];
  const contentKey = section.source?.contentKey ?? "";
  const item = items.find((i) => i.contentKey === contentKey);
  const schema = readSettingsSchema(source);
  const Icon = SOURCE_ICON[sourceKey] ?? Link2;
  const route = MANAGE_ROUTE[sourceKey];

  const [style, setStyle] = useState<SectionStyle>(section.style ?? {});
  const [hiddenOn, setHiddenOn] = useState<DeviceClass[]>(section.hiddenOn ?? []);
  const [anchor, setAnchor] = useState(section.anchor ?? "");
  const initial = settingsEditorState(section.sourceSettings);
  const [settings, setSettings] = useState<SettingsObject | null>(initial.object);
  const [raw, setRaw] = useState(initial.raw);
  const [rawError, setRawError] = useState(false);
  const [saved, setSaved] = useState(false);

  // A fresh copy of the section (another write, a reload) replaces the local edits.
  useEffect(() => {
    setStyle(section.style ?? {});
    setHiddenOn(section.hiddenOn ?? []);
    setAnchor(section.anchor ?? "");
    const next = settingsEditorState(section.sourceSettings);
    setSettings(next.object);
    setRaw(next.raw);
    setRawError(false);
  }, [section]);

  // The live preview shows the presentation edits (devices, anchor, style) before Save.
  usePreviewEdit(sync, page, section, { style, hiddenOn, anchor });

  const nameOf = (i: (typeof items)[number]) => i.displayNames?.[locale] ?? i.displayName;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" });
  const otherUses = item ? item.usage.sectionCount - (section.primary ? 0 : 1) : 0;

  function save() {
    setSaved(false);
    let sourceSettings;
    try {
      sourceSettings = settingsForSave(settings, raw);
      setRawError(false);
    } catch {
      setRawError(true);
      return;
    }
    void act("save", () =>
      // A bound section sends no fields; its settings are replaced whole (omitting them would clear them).
      sync.updateSection(page.pageId, section.sectionId, { fields: {}, style, hiddenOn, anchor: anchor.replace(/-+$/, "") || null, sourceSettings })
    ).then(setSaved);
  }

  const dirtySettings = (() => {
    try {
      return stableJson(settingsForSave(settings, raw)) !== stableJson(section.sourceSettings ?? null);
    } catch {
      return true;
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Icon size={15} className="shrink-0 text-[var(--octo-text-faint)]" />
        <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{label}</span>
        <Badge tone="neutral">{tx("pl.sections.bound")}</Badge>
        {section.sourceState === "unavailable" && <Badge tone="warning">{tx("pl.module.unavailable")}</Badge>}
      </div>

      <ToggleRow
        label={tx("pl.module.shown")}
        note={section.primary ? tx("pl.sections.primary") : tx("pl.module.shownNote")}
        checked={section.enabled}
        onChange={() => {
          if (section.primary || busy !== null) return;
          void act("enabled", () => sync.setSectionEnabled(page.pageId, section.sectionId, !section.enabled));
        }}
      />

      <FieldRow label={tx("pl.module.connectedTo")}>
        <Select
          aria-label={tx("pl.module.connectedTo")}
          value={contentKey}
          disabled={section.primary || busy !== null}
          onChange={(e) => {
            const next = e.target.value;
            if (!next || next === contentKey) return;
            void act("rebind", async () => {
              const id = await sync.rebindSection(page.pageId, section.sectionId, next);
              if (id) onRebound(id);
            });
          }}
        >
          {!item && <option value={contentKey}>{contentKey || "—"}</option>}
          {items.map((i) => (
            <option key={i.contentKey} value={i.contentKey}>
              {nameOf(i)}
            </option>
          ))}
        </Select>
      </FieldRow>
      {section.primary && <p className="-mt-2 text-[11px] text-[var(--octo-text-muted)]">{tx("pl.module.primaryBinding")}</p>}
      {!item && <p className="-mt-2 text-[11px] text-[#B45309]">{tx("pl.module.notListed")}</p>}

      {item && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2 text-[11.5px] text-[var(--octo-text-secondary)]">
          <span>{tx("pl.module.entries", { n: item.entryCount })}</span>
          <span>{tx("pl.module.updated", { date: fmt(item.updatedAtUtc) })}</span>
          {item.usage.pageId && item.usage.pageId !== page.pageId && <span>{tx("pl.module.hasPage")}</span>}
          {otherUses > 0 && <span>{tx("pl.module.otherSections", { n: otherUses })}</span>}
        </div>
      )}
      {section.sourceState === "unavailable" && <p className="-mt-2 text-[11.5px] text-[#B45309]">{tx("pl.sections.unavailable")}</p>}
      {route && (
        <Button size="sm" variant="secondary" icon={<ExternalLink size={13} />} onClick={() => navigate(route)} className="w-fit">
          {tx("pl.sections.manage")}
        </Button>
      )}

      <div className="flex flex-col gap-3 border-t border-[var(--octo-divider)] pt-3">
        <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{tx("pl.settings.title")}</p>
        <p className="-mt-2 text-[11px] text-[var(--octo-text-muted)]">{schema.length ? tx("pl.settings.note") : tx("pl.settings.noSchema")}</p>
        <SourceSettingsEditor
          schema={schema}
          settings={settings}
          raw={raw}
          onSettings={setSettings}
          onRaw={(text) => {
            setRaw(text);
            setRawError(false);
          }}
          lang={sync.editLanguage}
        />
        {rawError && <span className="text-[11px] text-[#DC2626]">{tx("pl.settings.badJson")}</span>}
        {dirtySettings && <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.settings.unsaved")}</span>}
      </div>

      <StyleEditor type={undefined} style={style} hiddenOn={hiddenOn} anchor={anchor} onStyle={setStyle} onHiddenOn={setHiddenOn} onAnchor={setAnchor} />
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy !== null}>
          {busy === "save" ? tx("pl.common.saving") : tx("pl.common.save")}
        </Button>
        {busy === "rebind" && <span className="text-[11.5px] text-[var(--octo-text-muted)]">{tx("pl.common.saving")}</span>}
        {saved && <span className="text-[11.5px] text-[#16a34a]">{tx("pl.sections.saved")}</span>}
      </div>
    </div>
  );
}
