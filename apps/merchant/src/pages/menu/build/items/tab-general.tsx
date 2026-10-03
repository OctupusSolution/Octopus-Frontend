// The General tab: two columns, as the frame lays them out. Text and media on
// the start side, image, tags, status and id on the end side.
//
// Item Name, Short Name and Item Image carry the frame's red asterisk. Their
// messages come from the step's form (use-item-form), which shows one only
// after its field has been left or a save was attempted.
import { useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useFilePicker, type FilePicker } from "@/shared/ui/use-file-picker";
import { MediaTile } from "@/shared/ui/media-tile";
import {
  ITEM_NAME_MAX,
  ITEM_SHORT_NAME_MAX,
  ITEM_SKU_MAX,
  createNamedLabel,
  describeApiError,
  errorCodeOf,
  invalidateMenuResource,
  labelCodeFor,
  useMenuLabels,
  type Item,
  type ItemTag,
  type KnownItemTag,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { LabelsManager, useLabelName } from "../../labels-manager";
import { useMenuCopy } from "../../copy";
import { Field } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_INVALID, FOCUS, LINE, SURFACE_BLUE, SURFACE_SUBTLE, TEXT, TEXT_GRAY } from "../../_shared/theme";
import { ACCENT_TEXT, FIELD_4, FieldError, LABEL_12, LABEL_14, LABEL_16, OUTLINE_36, RadioRow, TRASH_36 } from "./ui";
import type { ItemForm } from "./use-item-form";

/** "Manage labels" opens the business's label manager. No frame draws it;
 *  flip this to offer it again under the tags. */
const SHOW_MANAGE_LABELS: boolean = false;

// The frame's four tags — shown only when the business's ItemTag labels
// (GET /menu/labels) cannot be read; otherwise the chips are those labels.
const TAGS: { id: KnownItemTag; key: string }[] = [
  { id: "chef-recommended", key: "menuWiz.item.tag.chef" },
  { id: "top-selling", key: "menuWiz.item.tag.top" },
  { id: "most-ordered", key: "menuWiz.item.tag.most" },
  { id: "healthy-choice", key: "menuWiz.item.tag.healthy" },
];

const STATUSES: Item["status"][] = ["active", "draft", "unavailable"];

const CHIP = "inline-flex items-center rounded-full px-2 py-1 text-[12px] font-medium leading-3";
const CHIP_ON = "bg-[#0D6EFD] text-white";
const CHIP_OFF = `${SURFACE_BLUE} ${ACCENT_TEXT}`;

function PickerError({ picker, tooLargeKey }: { picker: FilePicker; tooLargeKey: string }) {
  const { t } = useI18n();
  if (!picker.error) return null;
  return <FieldError>{t(picker.error === "too-large" ? tooLargeKey : "menuWiz.item.error.unreadable")}</FieldError>;
}

export function TabGeneral({
  item,
  onPatch,
  form,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
  form: ItemForm;
}) {
  const { t } = useI18n();
  const image = useFilePicker((url) => onPatch({ image: url }));
  const video = useFilePicker((url) => onPatch({ video: url }), "video");

  const c = useMenuCopy();
  const labelName = useLabelName();
  const labels = useMenuLabels();
  const [tagDraft, setTagDraft] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Server labels when there are any; the frame's presets otherwise.
  const serverTags = (labels.data ?? []).filter((l) => l.kind === "ItemTag");
  const chips =
    serverTags.length > 0
      ? serverTags.map((l) => ({ id: l.code, text: labelName(l) }))
      : TAGS.map((tag) => ({ id: tag.id as string, text: t(tag.key) }));
  const chipIds = chips.map((chip) => chip.id);
  const customTags = item.tags.filter((tag) => !chipIds.includes(tag));

  const message = (field: string) => {
    const key = form.error(field);
    return key ? t(key) : null;
  };
  const nameError = message("name");
  const shortNameError = message("shortName");
  const skuError = message("sku");
  const imageError = message("image");

  function toggleTag(tag: ItemTag) {
    onPatch({
      tags: item.tags.includes(tag) ? item.tags.filter((x) => x !== tag) : [...item.tags, tag],
    });
  }

  async function commitTag() {
    const name = (tagDraft ?? "").trim();
    setTagDraft(null);
    setTagError(null);
    if (!name) return;
    // Case-insensitive, so "Spicy" and "spicy" do not become two chips.
    if (item.tags.some((tag) => tag.toLowerCase() === name.toLowerCase())) return;
    if (!labels.businessId) {
      onPatch({ tags: [...item.tags, name] });
      return;
    }
    // A typed tag becomes a business label (so every item can pick it), and
    // the item stores its code — the API references tags by code.
    const code = labelCodeFor(name);
    if (item.tags.includes(code)) return;
    try {
      await createNamedLabel(labels.businessId, "ItemTag", { en: name, ar: name }, code);
      invalidateMenuResource("labels");
    } catch (err) {
      if (errorCodeOf(err) !== "menu.label.code-taken") {
        setTagError(describeApiError(err));
        return;
      }
    }
    onPatch({ tags: [...item.tags, code] });
  }

  function copyId() {
    void navigator.clipboard?.writeText(item.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
        <Field label={t("menuWiz.item.name")} required error={nameError}>
          <input
            className={clsx(FIELD_4, nameError && FIELD_INVALID)}
            value={item.name}
            maxLength={ITEM_NAME_MAX + 20}
            aria-label={t("menuWiz.item.name")}
            aria-invalid={nameError ? true : undefined}
            onChange={(e) => onPatch({ name: e.target.value })}
            onBlur={() => form.touch("name")}
          />
        </Field>

        <Field
          label={t("menuWiz.item.shortName")}
          hint={`(${t("menuWiz.item.shortNameHint")})`}
          required
          error={shortNameError}
        >
          <input
            className={clsx(FIELD_4, shortNameError && FIELD_INVALID)}
            value={item.shortName}
            maxLength={ITEM_SHORT_NAME_MAX + 20}
            aria-label={t("menuWiz.item.shortName")}
            aria-invalid={shortNameError ? true : undefined}
            onChange={(e) => onPatch({ shortName: e.target.value })}
            onBlur={() => form.touch("shortName")}
          />
        </Field>

        <label className="flex flex-col gap-2">
          <span className={LABEL_14}>{t("menuWiz.item.description")}</span>
          <textarea
            rows={3}
            value={item.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            className={clsx(
              "w-full resize-y rounded-[12px] border bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium leading-[1.4]",
              LINE,
              TEXT,
              FOCUS
            )}
          />
        </label>

        <Field label={t("menuWiz.item.sku")} error={skuError}>
          <input
            dir="ltr"
            className={clsx(FIELD_4, "text-start", skuError && FIELD_INVALID)}
            value={item.sku}
            maxLength={ITEM_SKU_MAX + 20}
            aria-label={t("menuWiz.item.sku")}
            aria-invalid={skuError ? true : undefined}
            onChange={(e) => onPatch({ sku: e.target.value })}
            onBlur={() => form.touch("sku")}
          />
        </Field>

        <div className="flex flex-col gap-3">
          <p className={clsx("px-2", LABEL_16)}>
            {t("menuWiz.item.video")}
            <span className={clsx("ms-1 text-[12px] font-normal leading-3", TEXT_GRAY)}>
              ({t("menuWiz.item.videoOptional")})
            </span>
          </p>
          <button
            type="button"
            onClick={video.open}
            aria-label={t("menuWiz.item.uploadVideo")}
            className={clsx("flex h-[120px] w-full rounded-[12px] border border-dashed p-2", LINE, FOCUS)}
          >
            <span className={clsx("relative grid size-full place-items-center overflow-hidden", !item.video && SURFACE_SUBTLE)}>
              {item.video && (
                <>
                  <video src={item.video} className="absolute inset-0 size-full object-cover" muted preload="metadata" />
                  <span className="absolute inset-0 bg-black/25" aria-hidden />
                </>
              )}
              <span className="relative grid size-10 place-items-center rounded-full bg-white text-black" aria-hidden>
                <MenuIcon name="menu-video-circle.svg" size={40} />
              </span>
            </span>
          </button>
          {video.input}
          <div className="flex flex-col gap-2">
            <button type="button" className={clsx(OUTLINE_36, "w-full")} onClick={video.open}>
              <MenuIcon name="menu-upload.svg" size={24} />
              {t("menuWiz.item.uploadVideo")}
            </button>
            <PickerError picker={video} tooLargeKey="menuWiz.item.error.videoTooLarge" />
            <p className={clsx("text-[12px] leading-3", TEXT_GRAY)}>{t("menuWiz.item.videoHint")}</p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p className={LABEL_12}>
            {t("menuWiz.item.image")} <span className="text-[#d30202]">*</span>
          </p>
          <button
            type="button"
            onClick={image.open}
            onBlur={() => form.touch("image")}
            aria-label={t(item.image ? "menuWiz.item.changeImage" : "menuWiz.item.uploadImage")}
            aria-invalid={imageError ? true : undefined}
            className={clsx(
              "block aspect-[242/168] w-full rounded-[12px] border border-dashed p-1",
              LINE,
              FOCUS,
              imageError && FIELD_INVALID
            )}
          >
            <MediaTile src={item.image} rounded="rounded-[8px]" />
          </button>
          {image.input}
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className={clsx(OUTLINE_36, "min-w-0 flex-1")}
                onClick={image.open}
                onBlur={() => form.touch("image")}
              >
                <span className="truncate">{t(item.image ? "menuWiz.item.changeImage" : "menuWiz.item.uploadImage")}</span>
              </button>
              <button
                type="button"
                aria-label={t("menuWiz.item.deleteImage")}
                onClick={() => {
                  onPatch({ image: null });
                  form.touch("image");
                }}
                className={TRASH_36}
              >
                <MenuIcon name="menu-trash.svg" size={24} />
              </button>
            </div>
            <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuWiz.item.imageHint")}</p>
            <PickerError picker={image} tooLargeKey="menuWiz.item.error.imageTooLarge" />
            {!image.error && <FieldError>{imageError}</FieldError>}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className={LABEL_12}>{t("menuWiz.item.tags")}</p>
          <div className="flex flex-wrap items-start gap-2">
            {chips.map(({ id, text }) => {
              const on = item.tags.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(id)}
                  className={clsx(CHIP, on ? CHIP_ON : CHIP_OFF)}
                >
                  {text}
                </button>
              );
            })}
            {/* A custom tag only exists because the merchant typed it, so it is
                always "on"; removing the chip is how it is turned off. */}
            {customTags.map((tag) => (
              <span key={tag} className={clsx(CHIP, CHIP_ON, "gap-1")}>
                {labelName({ code: tag, label: {} })}
                <button
                  type="button"
                  aria-label={t("menuWiz.item.removeTag").replace("{name}", tag)}
                  onClick={() => toggleTag(tag)}
                  className="grid size-3 place-items-center rounded-full hover:bg-white/20"
                >
                  <X size={10} aria-hidden />
                </button>
              </span>
            ))}

            {tagDraft === null && (
              <button
                type="button"
                onClick={() => setTagDraft("")}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full border px-[9px] py-[5px] text-[12px] font-medium leading-3 hover:bg-[var(--octo-hover)]",
                  LINE,
                  TEXT
                )}
              >
                <MenuIcon name="menu-plus-line.svg" size={16} />
                {t("menuWiz.item.addTag")}
              </button>
            )}
            {SHOW_MANAGE_LABELS && labels.businessId && tagDraft === null && (
              <button
                type="button"
                onClick={() => setManageOpen(true)}
                className="inline-flex items-center rounded-full px-2 py-1 text-[12px] font-medium leading-3 text-[#0D6EFD] hover:bg-[var(--octo-hover)]"
              >
                {c("labels.manage")}
              </button>
            )}
          </div>

          {tagDraft !== null && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={tagDraft}
                maxLength={32}
                placeholder={t("menuWiz.item.tagPlaceholder")}
                aria-label={t("menuWiz.item.tagPlaceholder")}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitTag();
                  }
                  if (e.key === "Escape") setTagDraft(null);
                }}
                className={clsx(FIELD_4, "!h-9 min-w-0 flex-1 !text-[12px]")}
              />
              <button
                type="button"
                onClick={() => void commitTag()}
                className="h-9 shrink-0 rounded-[8px] bg-[#0D6EFD] px-3 text-[12px] font-bold leading-3 text-white hover:opacity-90"
              >
                {t("menuWiz.item.tagSave")}
              </button>
              <button
                type="button"
                aria-label={t("menuWiz.cancel")}
                onClick={() => setTagDraft(null)}
                className={clsx("grid size-9 shrink-0 place-items-center rounded-[8px] hover:bg-[var(--octo-hover)]", TEXT_GRAY)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          )}
          <FieldError>{tagError}</FieldError>
        </div>

        <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={c("labels.manage")} className="max-w-[600px]">
          <LabelsManager initialKind="ItemTag" />
        </Modal>

        <fieldset className="flex flex-col gap-2">
          <legend className={clsx("mb-3", LABEL_12)}>{t("menuWiz.item.status")}</legend>
          {STATUSES.map((status) => (
            <RadioRow
              key={status}
              name={`status-${item.id}`}
              checked={item.status === status}
              onChange={() => onPatch({ status })}
            >
              {t(`menuWiz.item.status.${status}`)}
            </RadioRow>
          ))}
        </fieldset>

        <div className="flex flex-col gap-2">
          <p className={clsx("px-2", LABEL_12)}>{t("menuWiz.item.id")}</p>
          {/* Read-only: the id identifies the row, so letting it be typed over
              would rename something the rest of the draft still points at. */}
          <div className={clsx("flex h-10 items-center justify-between gap-2 rounded-[4px] border p-2", LINE)}>
            <span dir="ltr" className={clsx("min-w-0 flex-1 truncate text-start text-[14px] leading-[14px]", TEXT)}>
              {item.id}
            </span>
            <button
              type="button"
              aria-label={t("menuWiz.item.copyId")}
              onClick={copyId}
              className={clsx("grid size-4 shrink-0 place-items-center rounded-[2px]", copied ? "text-[#009a39]" : "text-[#0D6EFD]")}
            >
              <MenuIcon name={copied ? "menu-done-circle.svg" : "menu-copy.svg"} size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
