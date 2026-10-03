// Step 4 — Review & Publish.
//
// Every number on this screen is derived from the draft, and the validation
// summary is validate() over it. Nothing here is a fixture, which is the whole
// point: the merchant is deciding whether to go live on what it says.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { ApiError, getMenu, getValidationReport, publishMenu } from "@octopus/api-client";
import {
  OFFERS_SECTION_ID,
  validate,
  type Item,
  type Offer,
  type Section,
} from "@/entities/menu";
import { MediaTile } from "@/shared/ui/media-tile";
import { menuAsset } from "@/shared/lib/menu-assets";
import { useAuth } from "@/app/providers/auth-provider";
import { fromServer } from "@/entities/menu/menu-api";
import { useMenuLibrary } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { PopoverMenu, StatusPill, type PopoverItem } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { LINE, MODAL_SUBMIT, SURFACE_BLUE, SURFACE_SUBTLE, TEXT, TEXT_GRAY, type PillTone } from "../../_shared/theme";
import { findingText } from "./finding-text";
import { useDraft } from "../use-draft";
import { resolveImage } from "../preview-model";
import { ValidationSummary } from "./validation-summary";
import { CustomerPreview } from "./customer-preview";

/** "Customer view" (the framed storefront in a dialog) is not in the frame —
 *  only "View Full Menu" is. Flip this to draw its link beside it again. */
const SHOW_CUSTOMER_VIEW: boolean = false;

const ROCKET_ART = menuAsset("menu-rocket.svg");

/** The stat tiles as the frame draws them: a tinted card and a solid icon
 *  square. `size` is the exported glyph's own, centred in the 32px slot. */
const STAT_LOOK = {
  sections: { tint: "#f0f6ff", solid: "#0063f6", icon: "menu-stat-sections.svg", size: 32 },
  items: { tint: "#f7f0ff", solid: "#6903dd", icon: "menu-stat-items.svg", size: 32 },
  modifiers: { tint: "#fff0fa", solid: "#b7007a", icon: "menu-stat-modifiers.svg", size: 25.5 },
  offers: { tint: "#fffaf0", solid: "#bf8001", icon: "menu-stat-offers.svg", size: 28.2 },
  taxes: { tint: "#f0fff5", solid: "#009331", icon: "menu-stat-taxes.svg", size: 32 },
} as const;
type StatId = keyof typeof STAT_LOOK;

const PREVIEW_CARDS = 3;
const SUCCESS_RETURN_MS = 3500;

const CARD = `rounded-[24px] border ${LINE}`;
const CARD_TITLE = `text-[14px] font-bold leading-[14px] ${TEXT}`;
const STAT_CARD =
  "flex min-w-0 flex-col justify-center rounded-[12px] border-2 border-[#fefefe] p-2 drop-shadow-[0px_4px_2.5px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";
const STAT_LABEL = "truncate text-[14px] font-medium leading-[14px] text-[#6f6f6f] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
const PRICE_TEXT = "text-[#004bb9] [[data-theme=dark]_&]:text-[#8ab8ff]";
/** Sections / Items / Status / Actions, at the frame's own x positions. */
const OVERVIEW_GRID = "grid grid-cols-[minmax(0,166fr)_minmax(0,157fr)_minmax(0,119fr)_minmax(0,60fr)] items-center";

type SectionStatus = "published" | "limited" | "draft";
const STATUS_TONE: Record<SectionStatus, PillTone> = { published: "green", limited: "amber", draft: "slate" };
type SectionAction = "edit" | "items";

function ItemCard({ item }: { item: Item }) {
  return (
    <article className={clsx("flex min-w-0 flex-col gap-2 overflow-hidden rounded-[8px] border pb-2", LINE)}>
      {/* The height lives on a wrapper: MediaTile fills its box with h-full,
          which would otherwise win over a height passed in beside it. */}
      <div className="h-[148px] w-full shrink-0">
        <MediaTile src={resolveImage(item.image)} rounded="rounded-none" label={[item.name.slice(0, 2).toUpperCase(), ""]} />
      </div>
      <div className="flex min-h-[78px] flex-1 flex-col justify-center gap-2 px-2">
        <div className="flex flex-col gap-1">
          <p className={clsx("truncate text-[12px] font-semibold leading-3", TEXT)}>{item.name}</p>
          <p className={clsx("line-clamp-3 text-[10px] leading-[1.4]", TEXT_GRAY)}>{item.description}</p>
        </div>
        <p className={clsx("whitespace-nowrap text-[12px] font-bold leading-3", PRICE_TEXT)}>SAR {item.pricing.price}</p>
      </div>
    </article>
  );
}

export function ReviewStep() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { user, activeBusinessId } = useAuth();
  const { draft, setDraft, save } = useDraft();

  // Bumped by the summary's refresh icon. validate() is pure, so re-running it
  // over the same draft is what "refresh" honestly means.
  const [run, setRun] = useState(0);
  const result = useMemo(() => validate(draft), [draft, run]); // eslint-disable-line react-hooks/exhaustive-deps
  const blocked = result.errors.length > 0;

  const [filter, setFilter] = useState<string>("all");
  const [fullMenu, setFullMenu] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [actionsFor, setActionsFor] = useState<{ section: Section; anchor: DOMRect } | null>(null);
  const { replace } = useMenuLibrary();

  const itemSections = draft.sections.filter((s) => s.id !== OFFERS_SECTION_ID);
  // Archived sections stay listed in the overview (as Draft) but are not part
  // of what gets published, so the counts and the preview leave them out.
  const liveSections = itemSections.filter((s) => s.visibility !== "archived");
  const items = liveSections.flatMap((s) => s.entries as Item[]);
  const offers = (draft.sections.find((s) => s.id === OFFERS_SECTION_ID)?.entries ?? []) as Offer[];

  const modifierCount = items.reduce((n, item) => n + item.modifierGroups.length, 0);
  // Distinct VAT rates in use — "how many tax settings does this menu carry",
  // which is what the tile is asking, not how many items have one.
  const taxCount = new Set(items.filter((i) => i.pricing.vatRate > 0).map((i) => i.pricing.vatRate)).size;

  const previewItems = (filter === "all" ? items : (liveSections.find((s) => s.id === filter)?.entries ?? []) as Item[])
    .filter((item) => item.name.trim() !== "");

  const STATS: { id: StatId; key: string; value: number }[] = [
    // Sections the merchant made — the built-in offers section is not one.
    { id: "sections", key: "menuReview.stat.sections", value: liveSections.length },
    { id: "items", key: "menuReview.stat.items", value: items.length },
    { id: "modifiers", key: "menuReview.stat.modifiers", value: modifierCount },
    { id: "offers", key: "menuReview.stat.offers", value: offers.length },
    { id: "taxes", key: "menuReview.stat.taxes", value: taxCount },
  ];

  const DESTINATIONS: { key: string; hint: string; icon: string; size: number }[] = [
    { key: "menuReview.dest.pos", hint: "menuReview.dest.posHint", icon: "menu-pos-receipt.svg", size: 21.5 },
    { key: "menuReview.dest.publicLink", hint: "menuReview.dest.publicLinkHint", icon: "menu-globe.svg", size: 24 },
    { key: "menuReview.dest.tableQr", hint: "menuReview.dest.tableQrHint", icon: "menu-qr-code.svg", size: 24 },
  ];

  const SUMMARY = [
    "menuReview.sum.data",
    "menuReview.sum.images",
    "menuReview.sum.prices",
    "menuReview.sum.taxes",
    "menuReview.sum.modifiers",
    "menuReview.sum.offers",
  ];

  function formatDate(iso: string | null, withTime = true): string {
    if (!iso) return t("menuReview.never");
    return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      ...(withTime ? { timeStyle: "short" as const } : null),
    });
  }

  /** Going live: the menu and every channel it serves flip together, because a
   *  published menu that is live nowhere would be a lie the library card told. */
  async function publish() {
    if (blocked || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      // The server publishes what it holds, so what is on screen goes first.
      await save(draft);
      if (!activeBusinessId) throw new Error("No active business");
      const report = await getValidationReport(activeBusinessId, draft.id);
      if (!report.canPublish) {
        const first = report.errors[0];
        throw new Error(findingText(first?.code ?? "", locale));
      }
      await publishMenu(
        activeBusinessId,
        draft.id,
        { businessId: activeBusinessId, menuId: draft.id, reviewToken: report.reviewToken },
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      );
      // Status and channels come from the server's own answer.
      const fresh = fromServer(await getMenu(activeBusinessId, draft.id), draft);
      const next = { ...draft, status: fresh.status, channels: fresh.channels, version: fresh.version, publishedAt: fresh.publishedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
      setDraft(next);
      replace(next);
      setPublished(true);
    } catch (err) {
      setPublishError(err instanceof ApiError ? (err.problem?.detail ?? err.problem?.errorCode ?? err.message) : err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  // The confirmation stays long enough to read, then hands back to the
  // library, where the card now reads Active.
  useEffect(() => {
    if (!published) return;
    const id = window.setTimeout(() => navigate("/menu"), SUCCESS_RETURN_MS);
    return () => window.clearTimeout(id);
  }, [published, navigate]);

  const sectionActions: PopoverItem<SectionAction>[] = [
    { id: "edit", label: t("menuReview.action.edit") },
    { id: "items", label: t("menuReview.action.items") },
  ];

  const footerFacts: { icon: string; title: string; body: string }[] = [
    { icon: "menu-security-safe.svg", title: "menuReview.safeTitle", body: t("menuReview.safeBody") },
    { icon: "menu-clock.svg", title: "menuReview.lastPublish", body: formatDate(draft.publishedAt) },
    { icon: "menu-cloud-backup.svg", title: "menuReview.version", body: `V${draft.version}` },
    {
      icon: "menu-user.svg",
      title: "menuReview.publishedBy",
      // The session's own user — the only person this console knows
      // could have pressed Publish.
      body: draft.publishedAt ? (user?.name ?? t("menuReview.never")) : t("menuReview.never"),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-10">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-6">
          {STATS.map(({ id, key, value }) => {
            const look = STAT_LOOK[id];
            return (
              <div key={id} className={clsx(STAT_CARD, "[[data-theme=dark]_&]:!bg-[var(--octo-card)]")} style={{ backgroundColor: look.tint }}>
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-[12px] text-white" style={{ backgroundColor: look.solid }} aria-hidden>
                    <MenuIcon name={look.icon} size={look.size} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className={clsx("text-[32px] font-bold leading-8", TEXT)}>{value}</span>
                    <span className={STAT_LABEL}>{t(key)}</span>
                  </span>
                </div>
              </div>
            );
          })}
          <div className={clsx(STAT_CARD, "min-h-[70px]", SURFACE_SUBTLE)}>
            <div className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className={clsx("truncate text-[20px] font-bold leading-5", TEXT)}>{t("menuReview.lastSaved")}</span>
                <span className={STAT_LABEL}>{formatDate(draft.updatedAt, false)}</span>
              </span>
              <MenuIcon name="menu-check-done-outline.svg" size={24} className="text-[#0D6EFD]" />
            </div>
          </div>
        </div>

        {/* Two independent columns, as the frame stacks them: the publish card
            sits straight under validation and destinations however long the
            section table on the start side grows. */}
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <section className={clsx("flex flex-col gap-4 overflow-hidden p-4", CARD)}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className={clsx("min-w-0", CARD_TITLE)}>
                    {t("menuReview.previewTitle")} <span className="font-medium">({t("menuReview.previewComplete")})</span>
                  </h2>
                  <div className="flex shrink-0 flex-wrap items-center gap-4">
                    {SHOW_CUSTOMER_VIEW && <CustomerPreview />}
                    <button
                      type="button"
                      onClick={() => setFullMenu(true)}
                      className="inline-flex items-center gap-2 whitespace-nowrap text-[14px] font-bold leading-[14px] text-[#0D6EFD] hover:underline"
                    >
                      <MenuIcon name="menu-link-external.svg" size={24} />
                      {t("menuReview.viewFull")}
                    </button>
                  </div>
                </div>

                <div className="octo-scroll flex gap-3 overflow-x-auto">
                  {[{ id: "all", name: t("menuReview.allSections") }, ...liveSections].map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      aria-pressed={filter === section.id}
                      onClick={() => setFilter(section.id)}
                      className={clsx(
                        "shrink-0 whitespace-nowrap rounded-[4px] border px-1 py-2 text-[12px] font-medium leading-3",
                        filter === section.id
                          ? `border-[#0D6EFD] text-[#0D6EFD] ${SURFACE_BLUE}`
                          : "border-[#e2e8f0] bg-[var(--octo-card)] text-[#687280] hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]"
                      )}
                    >
                      {section.name}
                    </button>
                  ))}
                </div>
              </div>

              {previewItems.length === 0 ? (
                <p className={clsx("rounded-[8px] border border-dashed p-6 text-center text-[12px] font-medium leading-[1.4]", LINE, TEXT_GRAY)}>
                  {t("menuReview.noItems")}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {previewItems.slice(0, PREVIEW_CARDS).map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>

            <section className={clsx("flex flex-col gap-4 overflow-hidden p-4", CARD)}>
              <h2 className={CARD_TITLE}>{t("menuReview.overview")}</h2>
              <div role="table" className={clsx("flex flex-col gap-4 rounded-[12px] border p-3", LINE)}>
                <div role="row" className={clsx(OVERVIEW_GRID, "h-6 text-[12px] font-medium leading-3", SURFACE_SUBTLE, TEXT)}>
                  <span role="columnheader" className="truncate ps-2">
                    {t("menuReview.col.sections")}
                  </span>
                  <span role="columnheader" className="truncate">
                    {t("menuReview.col.items")}
                  </span>
                  <span role="columnheader" className="truncate">
                    {t("menuReview.col.status")}
                  </span>
                  <span role="columnheader" className="truncate pe-2 text-end">
                    {t("menuReview.col.actions")}
                  </span>
                </div>
                <div role="rowgroup" className="flex flex-col gap-4">
                  {itemSections.map((section, index) => {
                    // A section nobody can see is not "published", however
                    // full it is — the status column says what a customer
                    // would find. Archived reads the same as hidden.
                    const status: SectionStatus =
                      section.visibility !== "visible" ? "draft" : section.entries.length === 0 ? "limited" : "published";
                    return (
                      <div
                        key={section.id}
                        role="row"
                        className={clsx(OVERVIEW_GRID, "text-[14px] font-medium leading-[14px]", TEXT, index < itemSections.length - 1 && `border-b pb-2 ${LINE}`)}
                      >
                        <span role="cell" className="truncate pe-2">
                          {section.name}
                        </span>
                        <span role="cell" className="ps-[18px]">
                          {section.entries.length}
                        </span>
                        <span role="cell">
                          <StatusPill tone={STATUS_TONE[status]} className={status === "limited" ? "!text-[#de9000]" : undefined}>
                            {t(`menuReview.status.${status}`)}
                          </StatusPill>
                        </span>
                        <span role="cell" className="flex justify-end">
                          <button
                            type="button"
                            aria-label={`${t("menuReview.action.menu")}: ${section.name}`}
                            aria-haspopup="menu"
                            onClick={(event) => setActionsFor({ section, anchor: event.currentTarget.getBoundingClientRect() })}
                            className={clsx("grid size-6 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT)}
                          >
                            <MenuIcon name="menu-more-vertical-fill.svg" size={24} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-[30px]">
            <div className="grid items-start gap-6 sm:grid-cols-2">
              <ValidationSummary result={result} onRefresh={() => setRun((n) => n + 1)} />

              <div className="flex min-w-0 flex-col gap-4">
                <section className={clsx("flex flex-col gap-3 overflow-hidden p-3", CARD)}>
                  <div className="flex flex-col gap-2">
                    <h2 className={CARD_TITLE}>{t("menuReview.destinations")}</h2>
                    <p className={clsx("text-[12px] font-medium leading-[1.4]", TEXT_GRAY)}>{t("menuReview.destinationsHint")}</p>
                  </div>
                  {DESTINATIONS.map(({ key, hint, icon, size }) => (
                    <div key={key} className={clsx("flex items-start gap-2 rounded-[12px] border p-2", LINE)}>
                      <span className={clsx("grid size-6 shrink-0 place-items-center", TEXT)}>
                        <MenuIcon name={icon} size={size} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={clsx("truncate text-[12px] font-semibold leading-3", TEXT)}>{t(key)}</span>
                          <StatusPill tone={blocked ? "red" : "green"}>{t(blocked ? "menuReview.blocked" : "menuReview.ready")}</StatusPill>
                        </span>
                        <span className={clsx("text-[12px] leading-[1.2]", TEXT_GRAY)}>{t(hint)}</span>
                      </span>
                    </div>
                  ))}
                </section>

                <section className={clsx("flex flex-col gap-3 overflow-hidden p-3", CARD)}>
                  <h2 className={CARD_TITLE}>{t("menuReview.publishSummary")}</h2>
                  <ul className="flex flex-col gap-2">
                    {SUMMARY.map((key) => (
                      <li key={key} className="flex items-center justify-between gap-2">
                        <span className={clsx("inline-flex min-w-0 items-center gap-1 text-[12px] font-medium leading-3", TEXT_GRAY)}>
                          <MenuIcon
                            name="menu-check-done-circle.svg"
                            size={16}
                            className={blocked ? "text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]" : "text-[#009a39]"}
                          />
                          <span className="truncate">{t(key)}</span>
                        </span>
                        <span className={clsx("shrink-0 text-end text-[14px] font-semibold leading-[14px]", blocked ? "text-[#d30202]" : "text-[#009a39]")}>
                          {t(blocked ? "menuReview.blocked" : "menuReview.ready")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            <section
              className={clsx(
                "flex flex-col gap-4 overflow-hidden rounded-[24px] border p-6",
                blocked ? "border-[#d30202] bg-[#fef0f0] [[data-theme=dark]_&]:bg-[#d30202]/15" : `border-[#0D6EFD] ${SURFACE_BLUE}`
              )}
            >
              <div className="flex items-center gap-3">
                <img src={ROCKET_ART} alt="" className="size-[52px] shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <p className={clsx("text-[24px] font-bold leading-6", TEXT)}>{t(blocked ? "menuReview.blockedTitle" : "menuReview.goodTitle")}</p>
                  <p className={clsx("text-[16px] font-medium leading-4", TEXT_GRAY)}>{t(blocked ? "menuReview.blockedBody" : "menuReview.goodBody")}</p>
                </div>
              </div>
              {publishError && (
                <p role="alert" className="flex items-center gap-1 rounded-[12px] bg-[#fef0f0] px-3 py-2 text-[14px] font-medium leading-[1.3] text-[#d30202] [[data-theme=dark]_&]:bg-[#d30202]/15 [[data-theme=dark]_&]:text-[#ff8a8a]">
                  <MenuIcon name="menu-info-circle.svg" size={24} />
                  {publishError}
                </p>
              )}
              {/* Disabled with the reason above it, never a silently dead button. */}
              <button
                type="button"
                disabled={blocked || publishing}
                onClick={() => void publish()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0D6EFD] px-3 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="truncate">{t(publishing ? "menuReview.publishing" : "menuReview.publish")}</span>
                <MenuIcon name="menu-rocket-outline.svg" size={24} />
              </button>
            </section>
          </div>
        </div>
      </div>

      <section
        className={clsx(
          "grid rounded-[24px] border bg-[var(--octo-card)] p-3 drop-shadow-[0px_0px_4px_rgba(0,0,0,0.08)] sm:grid-cols-2 xl:grid-cols-4",
          LINE
        )}
      >
        {footerFacts.map(({ icon, title, body }, index) => (
          <div key={title} className={clsx("flex min-h-[70px] flex-col justify-center p-2", index < footerFacts.length - 1 && `xl:border-e ${LINE}`)}>
            <div className="flex items-center gap-2">
              <span className={clsx("grid size-10 shrink-0 place-items-center rounded-full text-[#0D6EFD]", SURFACE_BLUE)}>
                <MenuIcon name={icon} size={32} />
              </span>
              <span className={clsx("flex min-w-0 flex-1 flex-col", index === 0 ? "gap-1" : "gap-2")}>
                <span className={clsx("text-[16px] font-semibold leading-4", TEXT)}>{t(title)}</span>
                <span className={clsx("text-[12px] font-medium", index === 0 ? "leading-[1.4]" : "truncate leading-3", TEXT_GRAY)}>{body}</span>
              </span>
            </div>
          </div>
        ))}
      </section>

      <PopoverMenu
        anchor={actionsFor?.anchor ?? null}
        items={sectionActions}
        onClose={() => setActionsFor(null)}
        onPick={(action) => {
          setActionsFor(null);
          navigate(`/menu/${draft.id}/build/${action === "edit" ? "sections" : "items"}`);
        }}
      />

      <Modal
        open={fullMenu}
        onClose={() => setFullMenu(false)}
        backdropClassName="bg-black/60"
        className="!max-w-[960px] !rounded-[12px] !p-6 !shadow-none"
      >
        <div className="flex flex-col gap-6">
          <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
            {t("menuReview.previewTitle")} <span className="font-medium">({t("menuReview.previewComplete")})</span>
          </h2>
          <div className="octo-scroll flex max-h-[70vh] flex-col gap-6 overflow-y-auto pe-1">
            {itemSections.map((section) => {
              const list = (section.entries as Item[]).filter((item) => item.name.trim() !== "");
              if (list.length === 0) return null;
              return (
                <div key={section.id} className="flex flex-col gap-3">
                  <h3 className={CARD_TITLE}>
                    {section.name} <span className={clsx("font-medium", TEXT_GRAY)}>({list.length})</span>
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {list.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
            {items.length === 0 && <p className={clsx("p-6 text-center text-[12px] font-medium", TEXT_GRAY)}>{t("menuReview.noItems")}</p>}
          </div>
        </div>
      </Modal>

      <Modal
        open={published}
        onClose={() => navigate("/menu")}
        backdropClassName="bg-black/60"
        className="!max-w-[480px] !rounded-[12px] !p-6 !shadow-none"
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <img src={ROCKET_ART} alt="" className="size-[52px]" />
          <div className="flex flex-col gap-3">
            <p className={clsx("text-[24px] font-bold leading-6", TEXT)} role="status">
              {t("menuReview.publishedTitle")}
            </p>
            <p className={clsx("text-[14px] font-medium leading-[1.4]", TEXT_GRAY)}>{t("menuReview.publishedBody")}</p>
          </div>
          <button type="button" onClick={() => navigate("/menu")} className={MODAL_SUBMIT}>
            {t("menuReview.backToLibrary")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
