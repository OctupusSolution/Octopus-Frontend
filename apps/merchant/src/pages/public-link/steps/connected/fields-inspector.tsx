// A section inspector generated from the catalogue (GET /catalogues
// sectionTypes[].fields): every built-in section type gets typed editors for
// its fields — text, rich text (as paragraphs), media (uploaded into the site
// library), link, choice, toggle, number, colour and one level of lists — plus
// the presentation choices every section shares (layout variant, alignment,
// devices it is hidden on, anchor). Edits stay local until Save, which sends the
// whole field set (PUT /draft/pages/{pageId}/sections/{sectionId}).
//
// A failed image upload keeps the previous image and says so; it never blocks
// saving the rest of the section.
import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button, Input, Segmented, Select, Textarea } from "@ui/primitives";
import type {
  CatalogueFieldDefinition,
  CatalogueSectionType,
  DeviceClass,
  PageDraftResponse,
  SectionDraftResponse,
  SectionFields,
  SectionFieldValue,
  SectionLinkTarget,
  SectionStyle,
} from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { withText, type PublicLinkSync } from "@/entities/site-draft";
import type { SiteMediaPurpose } from "@/shared/api/media";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import { humanizeKey, usePlText } from "../../_shared/texts";
import { Switch } from "../../ui/switch";
import { FieldRow } from "../customize/controls";
import { orderedPages, pageTitle, SMALL_BUTTON, useBusy } from "./common";

const kindOf = (field: CatalogueFieldDefinition) => String(field.kind).toLowerCase();
/** "sections.hero.fields.title" -> "Title"; a missing label key falls back to the field key. */
const labelOf = (field: CatalogueFieldDefinition) => humanizeKey(field.labelKey || field.key);
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));

// ---- rich text <-> paragraphs -------------------------------------------------------------------

type RichDoc = Extract<SectionFieldValue, { kind: "richText" }>["text"][string];

export function richTextToPlain(doc: RichDoc | undefined): string {
  if (!doc) return "";
  const inline = (inlines: { kind: string; text?: string; runs?: { text: string }[] }[]) =>
    inlines.map((i) => (i.kind === "text" ? i.text ?? "" : i.kind === "link" ? (i.runs ?? []).map((r) => r.text).join("") : "\n")).join("");
  return doc.blocks
    .map((b) =>
      b.kind === "list"
        ? b.items.map((item) => item.map((ib) => ("inlines" in ib ? inline(ib.inlines as never) : "")).join(" ")).join("\n")
        : inline(b.inlines as never)
    )
    .join("\n\n");
}

export function plainToRichText(text: string): RichDoc {
  return {
    blocks: text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ kind: "p" as const, inlines: [{ kind: "text" as const, text: p, bold: false, italic: false, underline: false }] })),
  };
}

// ---- one field ----------------------------------------------------------------------------------

interface FieldEditorProps {
  field: CatalogueFieldDefinition;
  value: SectionFieldValue | undefined;
  onChange: (value: SectionFieldValue | undefined) => void;
  sync: PublicLinkSync;
  page: PageDraftResponse;
  lang: string;
  purposeHint: SiteMediaPurpose;
}

function MediaEditor({ field, value, onChange, sync, purposeHint }: FieldEditorProps) {
  const tx = usePlText();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const current = value && value.kind === "media" ? value : undefined;

  useEffect(() => {
    let cancelled = false;
    if (!current) {
      setUrl(null);
      return;
    }
    sync.siteMediaUrl(current.media.assetId).then((u) => !cancelled && setUrl(u), () => undefined);
    return () => {
      cancelled = true;
    };
  }, [current, sync]);

  const purposes = field.mediaPurposes.map((p) => p.toLowerCase());
  const purpose: SiteMediaPurpose = purposes.includes(purposeHint.toLowerCase())
    ? purposeHint
    : ((field.mediaPurposes[0] as SiteMediaPurpose | undefined) ?? "SectionImage");

  function pick(dataUrl: string) {
    setUploading(true);
    setFailed(false);
    sync
      .uploadSiteImage(dataUrl, purpose)
      .then((up) => {
        setUrl(up.url);
        onChange({ kind: "media", media: { assetId: up.assetId, kind: up.kind }, alt: current?.alt ?? {} });
      })
      .catch(() => setFailed(true)) // keep the previous image
      .finally(() => setUploading(false));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {url ? (
          <img src={url} alt="" className="h-14 w-24 rounded-[9px] object-cover" />
        ) : (
          <span className="flex h-14 w-24 items-center justify-center rounded-[9px] border border-dashed border-[var(--octo-border-input)] text-[var(--octo-text-faint)]">
            <Upload size={14} />
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => readLogoFile(e.target.files?.[0], pick)} />
        <Button variant="secondary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? tx("pl.common.saving") : tx("pl.field.upload")}
        </Button>
        {current && (
          <button type="button" aria-label={tx("pl.common.remove")} className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]" onClick={() => onChange(undefined)}>
            <X size={14} />
          </button>
        )}
      </div>
      {failed && <span className="text-[11px] text-[#DC2626]">{tx("pl.field.uploadFailed")}</span>}
    </div>
  );
}

function LinkEditor({ field, value, onChange, sync, page, lang }: FieldEditorProps) {
  const tx = usePlText();
  const { locale } = useI18n();
  const current = value && value.kind === "link" ? value : undefined;
  const kinds = (field.linkKinds.length ? field.linkKinds : ["page", "external"]).map((k) => k.toLowerCase());
  const target = current?.target;
  const label = current?.label ?? {};
  const pages = orderedPages(sync.server!);

  function setTarget(next: SectionLinkTarget | null) {
    onChange(next ? { kind: "link", target: next, label } : undefined);
  }

  function changeKind(kind: string) {
    const home = pages[0]?.pageId ?? page.pageId;
    switch (kind) {
      case "page":
        return setTarget({ kind: "page", pageId: home });
      case "anchor":
        return page.sections[0] ? setTarget({ kind: "anchor", pageId: page.pageId, sectionId: page.sections[0].sectionId }) : undefined;
      case "external":
        return setTarget({ kind: "external", url: "https://", openInNewTab: true });
      case "email":
        return setTarget({ kind: "email", address: "" });
      case "phone":
        return setTarget({ kind: "phone", number: "" });
      default:
        return setTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Select aria-label={tx("pl.field.linkKind")} value={target?.kind ?? ""} onChange={(e) => changeKind(e.target.value)}>
        <option value="">{tx("pl.field.link.none")}</option>
        {kinds.map((k) => (
          <option key={k} value={k}>
            {tx(`pl.field.link.${k}`)}
          </option>
        ))}
      </Select>
      {target?.kind === "page" && (
        <Select aria-label={tx("pl.field.link.page")} value={target.pageId} onChange={(e) => setTarget({ kind: "page", pageId: e.target.value })}>
          {pages.map((p) => (
            <option key={p.pageId} value={p.pageId}>
              {pageTitle(p, locale, lang)}
            </option>
          ))}
        </Select>
      )}
      {target?.kind === "anchor" && (
        <Select
          aria-label={tx("pl.field.link.anchor")}
          value={target.sectionId}
          onChange={(e) => setTarget({ kind: "anchor", pageId: page.pageId, sectionId: e.target.value })}
        >
          {page.sections.map((s, i) => (
            <option key={s.sectionId} value={s.sectionId}>
              {i + 1}. {s.anchor ?? s.type}
            </option>
          ))}
        </Select>
      )}
      {target?.kind === "external" && (
        <>
          <Input dir="ltr" aria-label="URL" value={target.url} onChange={(e) => setTarget({ ...target, url: e.target.value.trim() })} />
          <label className="flex items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]">
            <Switch checked={target.openInNewTab} onChange={() => setTarget({ ...target, openInNewTab: !target.openInNewTab })} label={tx("pl.field.newTab")} />
            {tx("pl.field.newTab")}
          </label>
        </>
      )}
      {target?.kind === "email" && (
        <Input dir="ltr" type="email" aria-label={tx("pl.field.link.email")} value={target.address} onChange={(e) => setTarget({ kind: "email", address: e.target.value.trim() })} />
      )}
      {target?.kind === "phone" && (
        <Input dir="ltr" type="tel" aria-label={tx("pl.field.link.phone")} value={target.number} onChange={(e) => setTarget({ kind: "phone", number: e.target.value })} />
      )}
      {target && (
        <Input
          aria-label={tx("pl.field.linkLabel")}
          placeholder={tx("pl.field.linkLabel")}
          value={label[lang] ?? ""}
          onChange={(e) => onChange({ kind: "link", target, label: withText(label, lang, e.target.value) })}
        />
      )}
    </div>
  );
}

function FieldEditor(props: FieldEditorProps) {
  const tx = usePlText();
  const { field, value, onChange, lang } = props;
  const kind = kindOf(field);

  if (kind === "text") {
    const text = value && value.kind === "text" ? value.text : {};
    const set = (v: string) => {
      const next = withText(text, lang, v);
      onChange(Object.keys(next).length ? { kind: "text", text: next } : undefined);
    };
    return field.multiline ? (
      <Textarea rows={3} maxLength={field.maxLength ?? undefined} value={text[lang] ?? ""} onChange={(e) => set(e.target.value)} />
    ) : (
      <Input maxLength={field.maxLength ?? undefined} value={text[lang] ?? ""} onChange={(e) => set(e.target.value)} />
    );
  }
  if (kind === "richtext") {
    const docs = value && value.kind === "richText" ? value.text : {};
    return (
      <Textarea
        rows={5}
        value={richTextToPlain(docs[lang])}
        onChange={(e) => {
          const next = { ...docs };
          if (e.target.value.trim()) next[lang] = plainToRichText(e.target.value);
          else delete next[lang];
          onChange(Object.keys(next).length ? { kind: "richText", text: next } : undefined);
        }}
      />
    );
  }
  if (kind === "media") return <MediaEditor {...props} />;
  if (kind === "link") return <LinkEditor {...props} />;
  if (kind === "choice") {
    return (
      <Select value={value && value.kind === "choice" ? value.key : ""} onChange={(e) => onChange(e.target.value ? { kind: "choice", key: e.target.value } : undefined)}>
        <option value="">—</option>
        {field.choices.map((c) => (
          <option key={c.key} value={c.key}>
            {humanizeKey(c.labelKey || c.key)}
          </option>
        ))}
      </Select>
    );
  }
  if (kind === "toggle") {
    const on = value && value.kind === "toggle" ? value.value : field.default === true;
    return <Switch checked={on} onChange={() => onChange({ kind: "toggle", value: !on })} label={labelOf(field)} />;
  }
  if (kind === "number") {
    return (
      <Input
        type="number"
        min={field.min ?? undefined}
        max={field.max ?? undefined}
        step={field.step ?? undefined}
        value={value && value.kind === "number" ? String(value.value) : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : { kind: "number", value: Number(e.target.value) })}
      />
    );
  }
  if (kind === "color") {
    const hex = value && value.kind === "color" ? value.color.hex ?? "" : "";
    return (
      <span className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000"} onChange={(e) => onChange({ kind: "color", color: { hex: e.target.value.toUpperCase() } })} aria-label={labelOf(field)} />
        <Input dir="ltr" value={hex} onChange={(e) => onChange(/^#[0-9a-f]{6}$/i.test(e.target.value) ? { kind: "color", color: { hex: e.target.value.toUpperCase() } } : undefined)} />
      </span>
    );
  }
  if (kind === "list") {
    const items = value && value.kind === "list" ? value.items : [];
    const setItems = (next: typeof items) => onChange(next.length ? { kind: "list", items: next } : undefined);
    return (
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-[var(--octo-text-muted)]">{tx("pl.field.item", { n: index + 1 })}</span>
              <button type="button" aria-label={tx("pl.common.remove")} className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]" onClick={() => setItems(items.filter((_i, n) => n !== index))}>
                <X size={13} />
              </button>
            </div>
            {field.itemFields.map((inner) => (
              <FieldRow key={inner.key} label={labelOf(inner)}>
                <FieldEditor
                  {...props}
                  field={inner}
                  value={item.fields[inner.key]}
                  onChange={(v) => {
                    const fields = { ...item.fields };
                    if (v) fields[inner.key] = v;
                    else delete fields[inner.key];
                    setItems(items.map((it, n) => (n === index ? { ...it, fields } : it)));
                  }}
                />
              </FieldRow>
            ))}
          </div>
        ))}
        {(field.maxItems === null || items.length < field.maxItems) && (
          <button type="button" className={SMALL_BUTTON + " w-fit"} onClick={() => setItems([...items, { id: newId(), fields: {} }])}>
            {tx("pl.field.addItem")}
          </button>
        )}
      </div>
    );
  }
  return <span className="text-[11px] text-[var(--octo-text-muted)]">{field.kind}</span>;
}

// ---- style (shared by built-in and bound sections) ---------------------------------------------

const DEVICES: DeviceClass[] = ["mobile", "tablet", "desktop"];

export function StyleEditor({
  type,
  style,
  hiddenOn,
  anchor,
  onStyle,
  onHiddenOn,
  onAnchor,
}: {
  type: CatalogueSectionType | undefined;
  style: SectionStyle;
  hiddenOn: DeviceClass[];
  anchor: string;
  onStyle: (style: SectionStyle) => void;
  onHiddenOn: (devices: DeviceClass[]) => void;
  onAnchor: (anchor: string) => void;
}) {
  const tx = usePlText();
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--octo-divider)] pt-3">
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{tx("pl.sections.style")}</p>
      {type && type.variants.length > 0 && (
        <FieldRow label={tx("pl.sections.variant")}>
          <Select value={style.variant ?? ""} onChange={(e) => onStyle({ ...style, variant: e.target.value || null })}>
            <option value="">{tx("pl.sections.default")}</option>
            {type.variants.map((v) => (
              <option key={v.key} value={v.key}>
                {humanizeKey(v.labelKey || v.key)}
              </option>
            ))}
          </Select>
        </FieldRow>
      )}
      {type && (
        <FieldRow label={tx("pl.sections.alignment")}>
          <Segmented
            options={[
              { id: "", label: tx("pl.sections.default") },
              ...(["start", "center", "end"] as const).map((id) => ({ id, label: tx(`pl.sections.align.${id}`) })),
            ]}
            value={style.alignment ?? ""}
            onChange={(id) => onStyle({ ...style, alignment: (id || null) as SectionStyle["alignment"] })}
          />
        </FieldRow>
      )}
      <FieldRow label={tx("pl.sections.hideOn")}>
        <div className="flex flex-wrap gap-3">
          {DEVICES.map((device) => {
            const on = hiddenOn.includes(device);
            return (
              <label key={device} className="flex items-center gap-1.5 text-[12px] text-[var(--octo-text-secondary)]">
                <Switch
                  checked={on}
                  onChange={() => onHiddenOn(on ? hiddenOn.filter((d) => d !== device) : [...hiddenOn, device])}
                  label={tx(`pl.sections.device.${device}`)}
                />
                {tx(`pl.sections.device.${device}`)}
              </label>
            );
          })}
        </div>
      </FieldRow>
      <FieldRow label={tx("pl.sections.anchor")}>
        <Input dir="ltr" value={anchor} maxLength={40} onChange={(e) => onAnchor(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^[^a-z]+/, ""))} />
      </FieldRow>
    </div>
  );
}

// ---- the inspector ------------------------------------------------------------------------------

export function FieldsInspector({
  sync,
  page,
  section,
  type,
}: {
  sync: PublicLinkSync;
  page: PageDraftResponse;
  section: SectionDraftResponse;
  type: CatalogueSectionType;
}) {
  const tx = usePlText();
  const { act, busy } = useBusy();
  const lang = sync.editLanguage;
  const [fields, setFields] = useState<SectionFields>(section.fields ?? {});
  const [style, setStyle] = useState<SectionStyle>(section.style ?? {});
  const [hiddenOn, setHiddenOn] = useState<DeviceClass[]>(section.hiddenOn ?? []);
  const [anchor, setAnchor] = useState(section.anchor ?? "");
  const [saved, setSaved] = useState(false);

  // Another write (a reorder, a theme reset) hands back a fresh copy of the section.
  useEffect(() => {
    setFields(section.fields ?? {});
    setStyle(section.style ?? {});
    setHiddenOn(section.hiddenOn ?? []);
    setAnchor(section.anchor ?? "");
  }, [section]);

  function save() {
    setSaved(false);
    void act("save", () =>
      sync.updateSection(page.pageId, section.sectionId, { fields, style, hiddenOn, anchor: anchor.replace(/-+$/, "") || null })
    ).then((ok) => setSaved(ok));
  }

  const purposeHint: SiteMediaPurpose = type.key === "hero" ? "HeroBackground" : "SectionImage";

  return (
    <div className="flex flex-col gap-4">
      {type.fields.map((field) => (
        <FieldRow key={field.key} label={labelOf(field) + (field.required ? " *" : "")}>
          <FieldEditor
            field={field}
            value={fields[field.key]}
            onChange={(v) =>
              setFields((f) => {
                const next = { ...f };
                if (v) next[field.key] = v;
                else delete next[field.key];
                return next;
              })
            }
            sync={sync}
            page={page}
            lang={lang}
            purposeHint={purposeHint}
          />
        </FieldRow>
      ))}
      <StyleEditor type={type} style={style} hiddenOn={hiddenOn} anchor={anchor} onStyle={setStyle} onHiddenOn={setHiddenOn} onAnchor={setAnchor} />
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy !== null}>
          {busy ? tx("pl.common.saving") : tx("pl.common.save")}
        </Button>
        {saved && <span className="text-[11.5px] text-[#16a34a]">{tx("pl.sections.saved")}</span>}
      </div>
    </div>
  );
}
