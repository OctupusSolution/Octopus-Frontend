// A section inspector generated from the catalogue (GET /catalogues
// sectionTypes[].fields): every built-in section type gets typed editors for
// its fields — text, rich text (a block editor that keeps headings, lists,
// marks and links; see rich-text-editor.tsx), media (uploaded into the site
// library or picked from it), link, choice, toggle, number, colour and one
// level of lists — plus
// the presentation choices every section shares (layout variant, alignment,
// devices it is hidden on, anchor). Edits stay local until Save, which sends the
// whole field set (PUT /draft/pages/{pageId}/sections/{sectionId}).
//
// A failed image upload keeps the previous image and says so; it never blocks
// saving the rest of the section.
//
// What the catalogue declares about a field (required, max length, number
// bounds) and what a link needs to work (a full address, a valid email) is
// checked here: a field reports its error once it was left, and Save is refused
// — every error shown — while one remains.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
  SiteMediaPurpose as ApiSiteMediaPurpose,
} from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { withText, type PublicLinkSync } from "@/entities/site-draft";
import type { SiteMediaPurpose } from "@/shared/api/media";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import { isRichTextEmpty } from "../../_shared/rich-text";
import { humanizeKey, usePlText } from "../../_shared/texts";
import { firstFailure, rules, useTouched, useValidation, type RuleFailure } from "../../_shared/validation";
import { PlButton, PlFieldError, PlInput, PlSelect, PlTextarea, plText } from "../../ui/kit";
import { Switch } from "../../ui/switch";
import { FieldRow, IMAGE_ACCEPT, ImageSlot, imageFileFailure, SegmentedChips, ToggleRow } from "../customize/controls";
import { orderedPages, pageTitle, SMALL_BUTTON, useBusy, usePreviewEdit } from "./common";
import { ALL_PURPOSES, MediaLibraryButton } from "./media-library";
import { RichTextEditor } from "./rich-text-editor";

const kindOf = (field: CatalogueFieldDefinition) => String(field.kind).toLowerCase();
/** "sections.hero.fields.title" -> "Title"; a missing label key falls back to the field key. */
const labelOf = (field: CatalogueFieldDefinition) => humanizeKey(field.labelKey || field.key);
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));

const HEX = /^#[0-9a-f]{6}$/i;
const PHONE = /^\+?[0-9\s().-]{6,20}$/;
const REQUIRED: RuleFailure = { key: "pl.v.required" };
const REMOVE_BUTTON =
  "grid h-6 w-6 shrink-0 place-items-center rounded text-[var(--pl-text-3)] transition-colors hover:text-[var(--pl-error)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";

// ---- validation ---------------------------------------------------------------------------------

function linkFailure(target: SectionLinkTarget): RuleFailure | null {
  if (target.kind === "external") return firstFailure(target.url, [rules.required(), rules.url()]);
  if (target.kind === "email") return firstFailure(target.address, [rules.required(), rules.email()]);
  if (target.kind === "phone") {
    if (!target.number.trim()) return REQUIRED;
    return PHONE.test(target.number.trim()) ? null : { key: "pl.navigation.phoneInvalid" };
  }
  return null;
}

/** What a field's own value breaks, or null. A translated field is "filled" when any language
 *  has it (the other languages are edited one at a time); the length cap is per language. */
export function fieldFailure(field: CatalogueFieldDefinition, value: SectionFieldValue | undefined, lang: string): RuleFailure | null {
  const kind = kindOf(field);
  if (kind === "toggle") return null;
  if (kind === "text") {
    const text = value && value.kind === "text" ? value.text : {};
    if (field.required && !Object.values(text).some((entry) => entry && entry.trim())) return REQUIRED;
    return field.maxLength ? firstFailure(text[lang] ?? "", [rules.maxLength(field.maxLength)]) : null;
  }
  if (kind === "number") {
    if (!value || value.kind !== "number") return field.required ? REQUIRED : null;
    const n = value.value;
    if (field.step != null && Number.isInteger(field.step) && !Number.isInteger(n)) return { key: "pl.v.integer" };
    if (field.min != null && n < field.min) return { key: "pl.v.min", vars: { min: field.min } };
    if (field.max != null && n > field.max) return { key: "pl.v.max", vars: { max: field.max } };
    return null;
  }
  if (kind === "link") {
    if (!value || value.kind !== "link") return field.required ? REQUIRED : null;
    return linkFailure(value.target);
  }
  if (kind === "list") {
    const items = value && value.kind === "list" ? value.items : [];
    return field.required && items.length === 0 ? REQUIRED : null;
  }
  // richtext, media, choice, color: present or not.
  return field.required && !value ? REQUIRED : null;
}

/** Whether a field, or anything inside its list items, is invalid. */
function fieldInvalid(field: CatalogueFieldDefinition, value: SectionFieldValue | undefined, lang: string): boolean {
  if (fieldFailure(field, value, lang)) return true;
  if (kindOf(field) !== "list" || !value || value.kind !== "list") return false;
  return value.items.some((item) => field.itemFields.some((inner) => fieldInvalid(inner, item.fields[inner.key], lang)));
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
  /** The field is reporting an error: its control is drawn invalid. */
  invalid?: boolean;
  /** Save was pressed: the fields inside list items report their errors too. */
  showErrors?: boolean;
}

function MediaEditor({ field, value, onChange, sync, purposeHint, invalid }: FieldEditorProps) {
  const tx = usePlText();
  const { message } = useValidation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fileFailure, setFileFailure] = useState<RuleFailure | null>(null);
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
  // The library offers only what this field accepts (the server refuses other purposes: media.asset-not-usable).
  const accepted = ALL_PURPOSES.filter((p) => purposes.includes(p.toLowerCase()));
  const kinds = field.mediaKinds.map((k) => k.toLowerCase());
  const libraryKind = kinds.length === 1 && (kinds[0] === "image" || kinds[0] === "video") ? (kinds[0] as "image" | "video") : undefined;

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

  // PNG / JPG / WebP up to the builder's size cap; a refused file keeps the current image.
  function choose(file: File | undefined) {
    if (!file) return;
    const failure = imageFileFailure(file, tx("pl.customize.hero.imageTypes"));
    setFileFailure(failure);
    if (!failure) readLogoFile(file, pick);
  }

  return (
    <div className="flex flex-col gap-2">
      <ImageSlot src={url} empty={tx("pl.customize.noImage")} invalid={invalid || fileFailure !== null} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <PlButton variant="outline" size="xs" className="rounded-[8px]" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? tx("pl.common.saving") : tx("pl.field.upload")}
        </PlButton>
        <MediaLibraryButton
          sync={sync}
          purposes={(accepted.length ? accepted : [purpose]) as ApiSiteMediaPurpose[]}
          kind={libraryKind}
          onPick={(picked) => {
            setFailed(false);
            setUrl(picked.url);
            onChange({ kind: "media", media: { assetId: picked.assetId, kind: picked.kind }, alt: current?.alt ?? {} });
          }}
        />
        {current && (
          <button type="button" aria-label={tx("pl.common.remove")} className={REMOVE_BUTTON} onClick={() => onChange(undefined)}>
            <X size={16} />
          </button>
        )}
      </div>
      <PlFieldError>{message(fileFailure) ?? (failed ? tx("pl.field.uploadFailed") : undefined)}</PlFieldError>
    </div>
  );
}

function LinkEditor({ field, value, onChange, sync, page, lang, invalid }: FieldEditorProps) {
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
      <PlSelect aria-label={tx("pl.field.linkKind")} invalid={invalid && !target} value={target?.kind ?? ""} onChange={(e) => changeKind(e.target.value)}>
        <option value="">{tx("pl.field.link.none")}</option>
        {kinds.map((k) => (
          <option key={k} value={k}>
            {tx(`pl.field.link.${k}`)}
          </option>
        ))}
      </PlSelect>
      {target?.kind === "page" && (
        <PlSelect aria-label={tx("pl.field.link.page")} value={target.pageId} onChange={(e) => setTarget({ kind: "page", pageId: e.target.value })}>
          {pages.map((p) => (
            <option key={p.pageId} value={p.pageId}>
              {pageTitle(p, locale, lang)}
            </option>
          ))}
        </PlSelect>
      )}
      {target?.kind === "anchor" && (
        <PlSelect
          aria-label={tx("pl.field.link.anchor")}
          value={target.sectionId}
          onChange={(e) => setTarget({ kind: "anchor", pageId: page.pageId, sectionId: e.target.value })}
        >
          {page.sections.map((s, i) => (
            <option key={s.sectionId} value={s.sectionId}>
              {i + 1}. {s.anchor ?? s.type}
            </option>
          ))}
        </PlSelect>
      )}
      {target?.kind === "external" && (
        <>
          <PlInput dir="ltr" type="url" inputMode="url" aria-label="URL" invalid={invalid} value={target.url} onChange={(e) => setTarget({ ...target, url: e.target.value.trim() })} />
          <label className="flex items-center gap-2 text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">
            <Switch checked={target.openInNewTab} onChange={() => setTarget({ ...target, openInNewTab: !target.openInNewTab })} label={tx("pl.field.newTab")} />
            {tx("pl.field.newTab")}
          </label>
        </>
      )}
      {target?.kind === "email" && (
        <PlInput dir="ltr" type="email" inputMode="email" aria-label={tx("pl.field.link.email")} invalid={invalid} value={target.address} onChange={(e) => setTarget({ kind: "email", address: e.target.value.trim() })} />
      )}
      {target?.kind === "phone" && (
        <PlInput dir="ltr" type="tel" inputMode="tel" aria-label={tx("pl.field.link.phone")} invalid={invalid} value={target.number} onChange={(e) => setTarget({ kind: "phone", number: e.target.value })} />
      )}
      {target && (
        <PlInput
          aria-label={tx("pl.field.linkLabel")}
          placeholder={tx("pl.field.linkLabel")}
          maxLength={60}
          value={label[lang] ?? ""}
          onChange={(e) => onChange({ kind: "link", target, label: withText(label, lang, e.target.value) })}
        />
      )}
    </div>
  );
}

/** A hex colour typed by hand: the text is kept while it is being typed, the value follows only
 *  once it is a full #RRGGBB (an empty box clears it). */
function ColorEditor({ field, value, onChange, invalid }: FieldEditorProps) {
  const { check } = useValidation();
  const hex = value && value.kind === "color" ? value.color.hex ?? "" : "";
  const [text, setText] = useState(hex);
  const [left, setLeft] = useState(false);

  // Another write (the swatch, a reload) replaces what was typed.
  useEffect(() => {
    setText((current) => (current.toUpperCase() === hex.toUpperCase() ? current : hex));
  }, [hex]);

  const error = left ? check(text, [rules.hexColor()]) : undefined;
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2">
        <input
          type="color"
          className="h-10 w-10 shrink-0 cursor-pointer rounded-[8px] border border-[var(--pl-g300)] bg-transparent p-1"
          value={HEX.test(hex) ? hex : "#000000"}
          onChange={(e) => onChange({ kind: "color", color: { hex: e.target.value.toUpperCase() } })}
          aria-label={labelOf(field)}
        />
        <PlInput
          dir="ltr"
          aria-label={labelOf(field)}
          placeholder="#000000"
          maxLength={7}
          invalid={invalid || Boolean(error)}
          value={text}
          onBlur={() => setLeft(true)}
          onChange={(e) => {
            const next = e.target.value.trim();
            setText(next);
            if (HEX.test(next)) onChange({ kind: "color", color: { hex: next.toUpperCase() } });
            else if (!next) onChange(undefined);
          }}
        />
      </span>
      <PlFieldError>{error}</PlFieldError>
    </div>
  );
}

/** A field under its label; a toggle sits beside its label instead, as the frames draw one. */
function FieldBlock({ error, ...props }: FieldEditorProps & { error?: string }) {
  const { field, value, onChange } = props;
  if (kindOf(field) === "toggle") {
    const on = value && value.kind === "toggle" ? value.value : field.default === true;
    return <ToggleRow label={labelOf(field)} checked={on} onChange={() => onChange({ kind: "toggle", value: !on })} />;
  }
  return (
    <FieldRow label={labelOf(field)} required={field.required} error={error}>
      <FieldEditor {...props} invalid={Boolean(error)} />
    </FieldRow>
  );
}

function FieldEditor(props: FieldEditorProps) {
  const tx = usePlText();
  const { message } = useValidation();
  const { field, value, onChange, lang, invalid } = props;
  const kind = kindOf(field);

  if (kind === "text") {
    const text = value && value.kind === "text" ? value.text : {};
    const set = (v: string) => {
      const next = withText(text, lang, v);
      onChange(Object.keys(next).length ? { kind: "text", text: next } : undefined);
    };
    return field.multiline ? (
      <PlTextarea aria-label={labelOf(field)} rows={3} invalid={invalid} maxLength={field.maxLength ?? undefined} value={text[lang] ?? ""} onChange={(e) => set(e.target.value)} />
    ) : (
      <PlInput aria-label={labelOf(field)} invalid={invalid} maxLength={field.maxLength ?? undefined} value={text[lang] ?? ""} onChange={(e) => set(e.target.value)} />
    );
  }
  if (kind === "richtext") {
    const docs = value && value.kind === "richText" ? value.text : {};
    return (
      <RichTextEditor
        key={lang}
        label={labelOf(field)}
        sync={props.sync}
        page={props.page}
        value={docs[lang]}
        onChange={(doc) => {
          // Other languages are kept exactly as stored; an empty document means "absent".
          const next = { ...docs };
          if (isRichTextEmpty(doc)) delete next[lang];
          else next[lang] = doc;
          onChange(Object.keys(next).length ? { kind: "richText", text: next } : undefined);
        }}
      />
    );
  }
  if (kind === "media") return <MediaEditor {...props} />;
  if (kind === "link") return <LinkEditor {...props} />;
  if (kind === "choice") {
    return (
      <PlSelect
        aria-label={labelOf(field)}
        invalid={invalid}
        value={value && value.kind === "choice" ? value.key : ""}
        onChange={(e) => onChange(e.target.value ? { kind: "choice", key: e.target.value } : undefined)}
      >
        <option value="">—</option>
        {field.choices.map((c) => (
          <option key={c.key} value={c.key}>
            {humanizeKey(c.labelKey || c.key)}
          </option>
        ))}
      </PlSelect>
    );
  }
  if (kind === "toggle") {
    const on = value && value.kind === "toggle" ? value.value : field.default === true;
    return <Switch checked={on} onChange={() => onChange({ kind: "toggle", value: !on })} label={labelOf(field)} />;
  }
  if (kind === "number") {
    return (
      <PlInput
        type="number"
        inputMode="decimal"
        aria-label={labelOf(field)}
        invalid={invalid}
        min={field.min ?? undefined}
        max={field.max ?? undefined}
        step={field.step ?? undefined}
        value={value && value.kind === "number" ? String(value.value) : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : { kind: "number", value: Number(e.target.value) })}
      />
    );
  }
  if (kind === "color") return <ColorEditor {...props} />;
  if (kind === "list") {
    const items = value && value.kind === "list" ? value.items : [];
    const setItems = (next: typeof items) => onChange(next.length ? { kind: "list", items: next } : undefined);
    return (
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-4 rounded-[12px] border border-[var(--pl-g300)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium leading-[12px] text-[var(--pl-text-2)]">{tx("pl.field.item", { n: index + 1 })}</span>
              <button type="button" aria-label={tx("pl.common.remove")} className={REMOVE_BUTTON} onClick={() => setItems(items.filter((_i, n) => n !== index))}>
                <X size={16} />
              </button>
            </div>
            {field.itemFields.map((inner) => (
              <FieldBlock
                key={inner.key}
                {...props}
                field={inner}
                value={item.fields[inner.key]}
                error={props.showErrors ? message(fieldFailure(inner, item.fields[inner.key], lang)) : undefined}
                onChange={(v) => {
                  const fields = { ...item.fields };
                  if (v) fields[inner.key] = v;
                  else delete fields[inner.key];
                  setItems(items.map((it, n) => (n === index ? { ...it, fields } : it)));
                }}
              />
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
  return <span className={plText.hint}>{field.kind}</span>;
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
    <div className="flex flex-col gap-4 border-t border-[var(--pl-g200)] pt-4">
      <p className={plText.h6}>{tx("pl.sections.style")}</p>
      {type && type.variants.length > 0 && (
        <FieldRow label={tx("pl.sections.variant")}>
          <PlSelect aria-label={tx("pl.sections.variant")} value={style.variant ?? ""} onChange={(e) => onStyle({ ...style, variant: e.target.value || null })}>
            <option value="">{tx("pl.sections.default")}</option>
            {type.variants.map((v) => (
              <option key={v.key} value={v.key}>
                {humanizeKey(v.labelKey || v.key)}
              </option>
            ))}
          </PlSelect>
        </FieldRow>
      )}
      {type && (
        <FieldRow label={tx("pl.sections.alignment")}>
          <SegmentedChips
            label={tx("pl.sections.alignment")}
            className="!justify-start"
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
              <label key={device} className="flex items-center gap-2 text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">
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
        <PlInput dir="ltr" aria-label={tx("pl.sections.anchor")} value={anchor} maxLength={40} onChange={(e) => onAnchor(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^[^a-z]+/, ""))} />
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
  const { message } = useValidation();
  const { touched, touch, touchAll } = useTouched();
  const { act, busy } = useBusy();
  const lang = sync.editLanguage;
  // Save was pressed while something was invalid: every field (list items included) reports.
  const [blocked, setBlocked] = useState(false);
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

  // The live preview shows these edits as they are typed, before Save.
  usePreviewEdit(sync, page, section, { fields, style, hiddenOn, anchor });

  const invalid = type.fields.some((field) => fieldInvalid(field, fields[field.key], lang));

  function save() {
    setSaved(false);
    if (invalid) {
      touchAll();
      setBlocked(true);
      return;
    }
    void act("save", () =>
      sync.updateSection(page.pageId, section.sectionId, { fields, style, hiddenOn, anchor: anchor.replace(/-+$/, "") || null })
    ).then((ok) => setSaved(ok));
  }

  const purposeHint: SiteMediaPurpose = type.key === "hero" ? "HeroBackground" : "SectionImage";

  return (
    <div className="flex flex-col gap-4">
      {type.fields.map((field) => (
        // Leaving any control of a field marks it as visited (blur bubbles in React).
        <div key={field.key} onBlur={() => touch(field.key)}>
          <FieldBlock
            field={field}
            value={fields[field.key]}
            error={touched(field.key) ? message(fieldFailure(field, fields[field.key], lang)) : undefined}
            showErrors={blocked}
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
        </div>
      ))}
      <StyleEditor type={type} style={style} hiddenOn={hiddenOn} anchor={anchor} onStyle={setStyle} onHiddenOn={setHiddenOn} onAnchor={setAnchor} />
      <div className="flex flex-col gap-2">
        <PlButton size="md" className="w-full" onClick={save} disabled={busy !== null}>
          {busy ? tx("pl.common.saving") : tx("pl.common.save")}
        </PlButton>
        {blocked && invalid && <PlFieldError>{tx("pl.customize.fixFields")}</PlFieldError>}
        {saved && <span className="text-[12px] leading-[1.4] text-[var(--pl-success)]">{tx("pl.sections.saved")}</span>}
      </div>
    </div>
  );
}
