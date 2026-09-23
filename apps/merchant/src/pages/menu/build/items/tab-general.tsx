// The General tab: two columns, as the frame lays them out. Text and media on
// the start side, image, tags, status and id on the end side.
import { useState } from "react";
import { Copy, Play, Plus, Tags, Trash2, Upload, X } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useFilePicker, type FilePicker } from "@/shared/ui/use-file-picker";
import { MediaTile } from "@/shared/ui/media-tile";
import clsx from "clsx";
import {
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

// The frame's four tags — shown only when the business's ItemTag labels
// (GET /menu/labels) cannot be read; otherwise the chips are those labels.
const TAGS: { id: KnownItemTag; key: string }[] = [
  { id: "chef-recommended", key: "menuWiz.item.tag.chef" },
  { id: "top-selling", key: "menuWiz.item.tag.top" },
  { id: "most-ordered", key: "menuWiz.item.tag.most" },
  { id: "healthy-choice", key: "menuWiz.item.tag.healthy" },
];

const STATUSES: Item["status"][] = ["active", "draft", "unavailable"];

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
        {label}
        {hint && <span className="font-normal text-[var(--octo-text-secondary)]"> ({hint})</span>}
        {required && <span className="text-error"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]";

const outlineAccent =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--octo-accent)] px-3 text-[14px] font-medium text-[var(--octo-accent)] hover:bg-[var(--octo-hover)]";

function PickerError({ picker, tooLargeKey }: { picker: FilePicker; tooLargeKey: string }) {
  const { t } = useI18n();
  if (!picker.error) return null;
  return (
    <p role="alert" className="mt-1 text-[12.5px] text-error">
      {t(picker.error === "too-large" ? tooLargeKey : "menuWiz.item.error.unreadable")}
    </p>
  );
}

export function TabGeneral({
  item,
  onPatch,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
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
  // Server labels when there are any; the frame's presets otherwise.
  const serverTags = (labels.data ?? []).filter((l) => l.kind === "ItemTag");
  const chips =
    serverTags.length > 0
      ? serverTags.map((l) => ({ id: l.code, text: labelName(l) }))
      : TAGS.map((tag) => ({ id: tag.id as string, text: t(tag.key) }));
  const chipIds = chips.map((chip) => chip.id);
  const customTags = item.tags.filter((tag) => !chipIds.includes(tag));

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

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label={t("menuWiz.item.name")} required>
          <input
            className={inputClass}
            value={item.name}
            onChange={(e) => onPatch({ name: e.target.value })}
          />
        </Field>

        <Field label={t("menuWiz.item.shortName")} hint={t("menuWiz.item.shortNameHint")} required>
          <input
            className={inputClass}
            value={item.shortName}
            onChange={(e) => onPatch({ shortName: e.target.value })}
          />
        </Field>

        <Field label={t("menuWiz.item.description")}>
          <textarea
            rows={3}
            className={inputClass}
            value={item.description}
            onChange={(e) => onPatch({ description: e.target.value })}
          />
        </Field>

        <Field label={t("menuWiz.item.sku")}>
          <input
            className={inputClass}
            value={item.sku}
            onChange={(e) => onPatch({ sku: e.target.value })}
          />
        </Field>

        <div>
          <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
            {t("menuWiz.item.video")}{" "}
            <span className="font-normal text-[var(--octo-text-secondary)]">
              ({t("menuWiz.item.videoOptional")})
            </span>
          </p>
          <button
            type="button"
            onClick={video.open}
            className="relative mt-1.5 grid h-[150px] w-full place-items-center overflow-hidden rounded-[10px] border border-dashed border-[var(--octo-border-input)]"
          >
            {item.video && (
              <video
                src={item.video}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                preload="metadata"
              />
            )}
            <span
              className="relative grid h-11 w-11 place-items-center rounded-full bg-[var(--octo-text-primary)] text-[var(--octo-card)]"
              aria-hidden
            >
              <Play size={18} />
            </span>
          </button>
          {video.input}
          <button type="button" className={clsx(outlineAccent, "mt-2 w-full")} onClick={video.open}>
            <Upload size={16} aria-hidden />
            {t("menuWiz.item.uploadVideo")}
          </button>
          <PickerError picker={video} tooLargeKey="menuWiz.item.error.videoTooLarge" />
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
            {t("menuWiz.item.videoHint")}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
            {t("menuWiz.item.image")} <span className="text-error">*</span>
          </p>
          <button
            type="button"
            onClick={image.open}
            className="mt-1.5 block h-[210px] w-full overflow-hidden rounded-[10px] border border-dashed border-[var(--octo-border-input)]"
          >
            <MediaTile src={item.image} />
          </button>
          {image.input}
          <div className="mt-2 flex items-center gap-2">
            <button type="button" className={clsx(outlineAccent, "flex-1")} onClick={image.open}>
              {t("menuWiz.item.changeImage")}
            </button>
            <button
              type="button"
              aria-label={t("menuWiz.item.deleteImage")}
              onClick={() => onPatch({ image: null })}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-error/40 bg-error/10 text-error hover:bg-error/15"
            >
              <Trash2 size={18} />
            </button>
          </div>
          <PickerError picker={image} tooLargeKey="menuWiz.item.error.imageTooLarge" />
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
            {t("menuWiz.item.imageHint")}
          </p>
        </div>

        <div>
          <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
            {t("menuWiz.item.tags")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {chips.map(({ id, text }) => (
              <button
                key={id}
                type="button"
                aria-pressed={item.tags.includes(id)}
                onClick={() => toggleTag(id)}
                className={clsx(
                  "rounded-[8px] px-2.5 py-1.5 text-[13px]",
                  item.tags.includes(id)
                    ? "bg-[var(--octo-accent)] text-white"
                    : "bg-[var(--octo-selected)] text-[var(--octo-accent)]"
                )}
              >
                {text}
              </button>
            ))}
            {/* A custom tag only exists because the merchant typed it, so it is
                always "on"; removing the chip is how it is turned off. */}
            {customTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--octo-accent)] py-1.5 pe-1.5 ps-2.5 text-[13px] text-white"
              >
                {labelName({ code: tag, label: {} })}
                <button
                  type="button"
                  aria-label={t("menuWiz.item.removeTag").replace("{name}", tag)}
                  onClick={() => toggleTag(tag)}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-white/20"
                >
                  <X size={12} aria-hidden />
                </button>
              </span>
            ))}
          </div>

          {tagError && (
            <p role="alert" className="mt-1.5 text-[12px] text-error">
              {tagError}
            </p>
          )}
          {tagDraft === null ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTagDraft("")}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-card)] px-2.5 py-1.5 text-[13px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
              >
                <Plus size={15} aria-hidden />
                {t("menuWiz.item.addTag")}
              </button>
              {labels.businessId && (
                <button
                  type="button"
                  onClick={() => setManageOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-[13px] text-[var(--octo-accent)] hover:bg-[var(--octo-hover)]"
                >
                  <Tags size={15} aria-hidden />
                  {c("labels.manage")}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <input
                autoFocus
                value={tagDraft}
                maxLength={32}
                placeholder={t("menuWiz.item.tagPlaceholder")}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitTag();
                  }
                  if (e.key === "Escape") setTagDraft(null);
                }}
                className="h-9 min-w-0 flex-1 rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 text-[13px] text-[var(--octo-text-primary)]"
              />
              <button
                type="button"
                onClick={() => void commitTag()}
                className="h-9 rounded-[8px] bg-[var(--octo-accent)] px-3 text-[13px] font-medium text-white"
              >
                {t("menuWiz.item.tagSave")}
              </button>
              <button
                type="button"
                aria-label={t("menuWiz.cancel")}
                onClick={() => setTagDraft(null)}
                className="grid h-9 w-9 place-items-center rounded-[8px] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          )}
        </div>

        <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={c("labels.manage")} className="max-w-[600px]">
          <LabelsManager initialKind="ItemTag" />
        </Modal>

        <fieldset>
          <legend className="text-[14px] font-medium text-[var(--octo-text-primary)]">
            {t("menuWiz.item.status")}
          </legend>
          <div className="mt-1.5 space-y-2">
            {STATUSES.map((status) => (
              <label key={status} className="flex items-center gap-2.5 text-[14px]">
                <input
                  type="radio"
                  name={`status-${item.id}`}
                  checked={item.status === status}
                  onChange={() => onPatch({ status })}
                  className="h-4 w-4 accent-[var(--octo-accent)]"
                />
                <span
                  className={clsx(
                    item.status === status
                      ? "font-medium text-[var(--octo-accent)]"
                      : "text-[var(--octo-text-primary)]"
                  )}
                >
                  {t(`menuWiz.item.status.${status}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
            {t("menuWiz.item.id")}
          </p>
          {/* Read-only: the id identifies the row, so letting it be typed over
              would rename something the rest of the draft still points at. */}
          <div className="mt-1.5 flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--octo-text-secondary)]">
              {item.id}
            </span>
            <button
              type="button"
              aria-label={t("menuWiz.item.id")}
              onClick={() => navigator.clipboard?.writeText(item.id)}
              className="shrink-0 text-[var(--octo-accent)]"
            >
              <Copy size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
