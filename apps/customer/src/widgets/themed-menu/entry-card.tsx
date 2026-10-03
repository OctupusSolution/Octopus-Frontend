"use client";

import { ShoppingBag, Tag } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers";
import type { CardStyle } from "./menu-theme";
import type { EntryView } from "./menu-model";

const STOCK = "/images/storefront/all.png";

export interface EntryCardProps {
  entry: EntryView;
  card: CardStyle;
  showTags: boolean;
  /** Present in order mode: opens the add-to-cart dialog for this item. */
  onAdd?: () => void;
  onOpen: () => void;
}

export function EntryCard({ entry, card, showTags, onAdd, onOpen }: EntryCardProps) {
  const { t } = useI18n();
  const image = entry.imageUrl ?? STOCK;
  const tags = entry.kind === "item" && showTags ? entry.tags : [];
  const badge = entry.kind === "offer" ? entry.badge : null;
  const saving = entry.kind === "offer" && entry.saving ? t("store.menu.save").replace("{n}", entry.saving) : null;

  const price = (
    <span className="flex flex-col items-end leading-tight">
      <span className="whitespace-nowrap text-[14px] font-bold text-[var(--octo-store-price)]">{entry.price}</span>
      {entry.kind === "offer" && entry.was && <span className="whitespace-nowrap text-[11px] text-[var(--octo-text-faint)] line-through">{entry.was}</span>}
    </span>
  );
  const add =
    onAdd && entry.available ? (
      <button
        type="button"
        data-menu-add={entry.ref}
        aria-label={t("store.menu.add")}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[var(--octo-brand)] text-white hover:opacity-90"
      >
        <ShoppingBag size={16} />
      </button>
    ) : null;
  const chips = (
    <span className="flex flex-wrap gap-1">
      {[badge, saving, ...tags].filter((x): x is string => Boolean(x)).map((label) => (
        <span key={label} className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--octo-brand)_12%,transparent)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--octo-brand)]">
          <Tag size={10} aria-hidden />
          {label}
        </span>
      ))}
    </span>
  );
  const unavailable = !entry.available && <span className="text-[11px] font-semibold text-[var(--octo-text-muted)]">{t("store.menu.unavailable")}</span>;
  const description = entry.kind === "item" && entry.description ? <p className="line-clamp-2 text-[12px] leading-[1.6] text-[var(--octo-text-muted)]">{entry.description}</p> : null;
  const shell = clsx("relative cursor-pointer text-start", !entry.available && "opacity-60");

  if (card === "clean-minimal") {
    return (
      <article onClick={onOpen} className={clsx(shell, "flex flex-col gap-1 border-b border-[var(--octo-border-card)] py-3")}>
        {chips}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
          {price}
        </div>
        {description}
        <div className="flex items-center justify-between">{unavailable}{add}</div>
      </article>
    );
  }
  if (card === "image-left") {
    return (
      <article onClick={onOpen} className={clsx(shell, "flex gap-3 rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3")}>
        <img src={image} alt="" loading="lazy" className="h-[92px] w-[92px] shrink-0 rounded-xl bg-[var(--octo-store-soft)] object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {chips}
          <h3 className="truncate text-[14px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
          {description}
          <div className="mt-auto flex items-end justify-between gap-2">{price}{unavailable}{add}</div>
        </div>
      </article>
    );
  }
  if (card === "image-top") {
    return (
      <article onClick={onOpen} className={clsx(shell, "flex flex-col overflow-hidden rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]")}>
        <img src={image} alt="" loading="lazy" className="h-[150px] w-full bg-[var(--octo-store-soft)] object-cover" />
        <div className="flex flex-1 flex-col gap-1 p-3">
          {chips}
          <h3 className="truncate text-[14px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
          {description}
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">{add ?? unavailable}{price}</div>
        </div>
      </article>
    );
  }
  return (
    <article onClick={onOpen} className={clsx(shell, "flex flex-col rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3")}>
      {chips}
      <img src={image} alt="" loading="lazy" className="mx-auto mt-2 h-[110px] w-auto max-w-full object-contain" />
      <h3 className="mt-3 truncate text-[13px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
      {description}
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">{add ?? unavailable}{price}</div>
    </article>
  );
}
