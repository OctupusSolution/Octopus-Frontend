// The General tab: two columns, as the frame lays them out. Text and media on
// the start side, image, tags, status and id on the end side.
import { Copy, Play, Trash2, Upload } from "lucide-react";
import clsx from "clsx";
import { Button } from "@ui/primitives";
import type { Item, ItemTag } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const TAGS: { id: ItemTag; key: string }[] = [
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

export function TabGeneral({
  item,
  onPatch,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
}) {
  const { t } = useI18n();

  function toggleTag(tag: ItemTag) {
    onPatch({
      tags: item.tags.includes(tag) ? item.tags.filter((x) => x !== tag) : [...item.tags, tag],
    });
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
          <div className="mt-1.5 grid place-items-center rounded-[10px] border border-dashed border-[var(--octo-border-input)] py-8">
            <span
              className="grid h-11 w-11 place-items-center rounded-full bg-[var(--octo-text-primary)] text-[var(--octo-card)]"
              aria-hidden
            >
              <Play size={18} />
            </span>
          </div>
          <Button variant="secondary" className="mt-2 w-full justify-center" icon={<Upload size={15} />}>
            {t("menuWiz.item.uploadVideo")}
          </Button>
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
          <div className="mt-1.5 grid h-[190px] place-items-center rounded-[10px] border border-dashed border-[var(--octo-border-input)]">
            {item.image ? (
              <img src={item.image} alt="" className="h-full w-full rounded-[10px] object-cover" />
            ) : (
              <span
                className="grid h-16 w-16 place-items-center rounded-[10px] bg-[#0d2b21] text-center font-serif text-[11px] leading-tight text-white/70"
                aria-hidden
              >
                ME
                <br />
                NU
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" className="flex-1 justify-center">
              {t("menuWiz.item.changeImage")}
            </Button>
            <button
              type="button"
              aria-label={t("menuWiz.item.image")}
              onClick={() => onPatch({ image: null })}
              className="rounded-[9px] border border-[var(--octo-border-card)] p-2 text-error hover:bg-error/10"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
            {t("menuWiz.item.imageHint")}
          </p>
        </div>

        <div>
          <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
            {t("menuWiz.item.tags")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TAGS.map(({ id, key }) => (
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
                {t(key)}
              </button>
            ))}
          </div>
        </div>

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
