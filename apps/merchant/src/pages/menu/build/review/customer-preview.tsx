// "Customer view": the platform's own rendering of the saved draft
// (GET /menus/{id}/preview) — the exact document the public read would serve
// if the merchant published now, resolved to one language. Unlike the review
// cards above it (which read the local draft), this shows what the server
// understood, so anything it drops or reprices is visible before publishing.
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import clsx from "clsx";
import { Modal, Segmented } from "@ui/primitives";
import type { MenuPreviewItem, MenuPreviewMedia, MenuPreviewMoney, MenuPreviewResponse } from "@octopus/api-client";
import { describeApiError, previewDraft } from "@/entities/menu";
import { mediaUrl } from "@/shared/api/media";
import { MediaTile } from "@/shared/ui/media-tile";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";

const money = (m: MenuPreviewMoney | null | undefined) => (m ? `${m.currency} ${Number(m.amount.toFixed(2))}` : "");

function PreviewImage({ media, name }: { media: MenuPreviewMedia | null; name: string }) {
  const { activeBusinessId } = useAuth();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!media || !activeBusinessId) return;
    let cancelled = false;
    mediaUrl(activeBusinessId, media)
      .then((url) => !cancelled && setSrc(url))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [media, activeBusinessId]);
  return <MediaTile src={src} rounded="rounded-[8px]" label={[name.slice(0, 2).toUpperCase(), ""]} />;
}

function ItemRow({ item, doc }: { item: MenuPreviewItem; doc: MenuPreviewResponse }) {
  const groups = item.modifierGroupRefs.map((ref) => doc.modifierGroups[ref]).filter(Boolean);
  return (
    <li className={clsx("flex gap-3 py-2.5", !item.isAvailable && "opacity-50")}>
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[8px]">
        <PreviewImage media={item.image} name={item.name} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{item.name}</span>
          <span className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-[var(--octo-accent)]">{money(item.price)}</span>
        </span>
        {item.description && (
          <span className="mt-0.5 line-clamp-2 block text-[12px] text-[var(--octo-text-secondary)]">{item.description}</span>
        )}
        {(doc.menu.theme.showItemTags && item.tags.length > 0) || item.advisories.labels.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {doc.menu.theme.showItemTags &&
              item.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--octo-selected)] px-2 py-0.5 text-[11px] text-[var(--octo-accent)]">
                  {tag}
                </span>
              ))}
            {item.advisories.labels.map((label) => (
              <span key={label} className="rounded-full bg-[var(--octo-tone-warning-bg)] px-2 py-0.5 text-[11px] text-[var(--octo-tone-warning-text)]">
                {label}
              </span>
            ))}
          </span>
        ) : null}
        {groups.length > 0 && (
          <span className="mt-1 block text-[11.5px] text-[var(--octo-text-muted)]">
            {groups.map((g) => `${g.promptLabel} (${g.options.length})`).join(" · ")}
          </span>
        )}
      </span>
    </li>
  );
}

export function CustomerPreview({ menuId, onBeforeOpen }: { menuId: string; onBeforeOpen: () => Promise<unknown> | void }) {
  const c = useMenuCopy();
  const { locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<string>(locale);
  const [doc, setDoc] = useState<MenuPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeBusinessId) return;
    let cancelled = false;
    setError(null);
    setDoc(null);
    // The preview renders what is saved, so the draft is saved first.
    Promise.resolve(onBeforeOpen())
      .then(() => previewDraft(activeBusinessId, menuId, lang))
      .then((res) => !cancelled && setDoc(res))
      .catch((err) => !cancelled && setError(describeApiError(err)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeBusinessId, menuId, lang]);

  const theme = doc?.menu.theme;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--octo-accent)] hover:underline"
      >
        <Eye size={18} aria-hidden />
        {c("preview.open")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-h-[92vh] max-w-[620px] overflow-y-auto" title={c("preview.title")}>
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{c("preview.hint")}</p>
        {error ? (
          <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
            {error}
          </p>
        ) : !doc ? (
          <p className="py-10 text-center text-[13px] text-[var(--octo-text-muted)]">{c("loading")}</p>
        ) : (
          <div className="mt-3">
            {doc.availableLanguages.length > 1 && (
              <Segmented
                value={doc.language}
                onChange={setLang}
                options={doc.availableLanguages.map((l) => ({ id: l, label: l.toUpperCase() }))}
              />
            )}
            <div
              dir={doc.language === "ar" ? "rtl" : "ltr"}
              className="mt-3 overflow-hidden rounded-[12px] border border-[var(--octo-border-card)]"
            >
              <div
                className="px-4 py-4"
                style={{ backgroundColor: theme?.primaryColor ?? "var(--octo-accent)", color: "#fff" }}
              >
                <p className="text-[18px] font-bold">{doc.menu.name}</p>
                {theme?.heroText && <p className="mt-0.5 text-[13px] opacity-90">{theme.heroText}</p>}
              </div>
              {doc.sections.length === 0 ? (
                <p className="p-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("preview.empty")}</p>
              ) : (
                <div className="divide-y divide-[var(--octo-divider)] bg-[var(--octo-card)]">
                  {doc.sections.map((section, i) => (
                    <section key={i} className="px-4 py-3">
                      <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]" style={{ color: section.color ?? undefined }}>
                        {section.name}
                      </h3>
                      {section.description && <p className="text-[12px] text-[var(--octo-text-secondary)]">{section.description}</p>}
                      <ul className="divide-y divide-[var(--octo-divider)]">
                        {section.entries.map((entry) => {
                          const offer = doc.offers[entry.ref];
                          const item = doc.items[entry.ref];
                          if (item) return <ItemRow key={entry.ref} item={item} doc={doc} />;
                          if (!offer) return null;
                          return (
                            <li key={entry.ref} className={clsx("flex gap-3 py-2.5", !offer.isAvailable && "opacity-50")}>
                              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[8px]">
                                <PreviewImage media={offer.image} name={offer.name} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-2">
                                  <span className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                                    {offer.name}
                                    {offer.badge && (
                                      <span className="ms-1.5 rounded-full bg-[var(--octo-tone-gold-bg)] px-2 py-0.5 text-[11px] text-[var(--octo-tone-gold-text)]">
                                        {offer.badge}
                                      </span>
                                    )}
                                  </span>
                                  <span className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-[var(--octo-accent)]">
                                    {money(offer.price.price)}
                                  </span>
                                </span>
                                <span className="mt-0.5 block text-[12px] text-[var(--octo-text-secondary)]">
                                  {offer.components
                                    .map((comp) => `${comp.quantity}× ${doc.items[comp.itemRef]?.name ?? "—"}`)
                                    .join(", ")}
                                </span>
                                {offer.showSavingBadge && offer.price.saving.amount > 0 && (
                                  <span className="mt-0.5 block text-[11.5px] font-medium text-[var(--octo-tone-success-text)]">
                                    −{money(offer.price.saving)} ({Math.round(offer.price.savingPercent)}%)
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
