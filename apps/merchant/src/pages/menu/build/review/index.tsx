// Step 4 — Review & Publish.
//
// Every number on this screen is derived from the draft, and the validation
// summary is validate() over it. Nothing here is a fixture, which is the whole
// point: the merchant is deciding whether to go live on what it says.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  BadgeCheck,
  BadgePercent,
  CircleCheck,
  Clock,
  CloudUpload,
  Columns3,
  ExternalLink,
  Globe,
  ListChecks,
  MoreVertical,
  PartyPopper,
  QrCode,
  ReceiptText,
  Rocket,
  ShieldCheck,
  SquareMenu,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "@ui/primitives";
import { ApiError, getMenu, getValidationReport, publishMenu } from "@octopus/api-client";
import {
  OFFERS_SECTION_ID,
  channelStateFor,
  validate,
  type Item,
  type Offer,
} from "@/entities/menu";
import { MediaTile } from "@/shared/ui/media-tile";
import { useAuth } from "@/app/providers/auth-provider";
import { fromServer } from "@/entities/menu/menu-api";
import { useMenuLibrary } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { findingText } from "./finding-text";
import { useDraft } from "../use-draft";
import { resolveImage } from "../preview-model";
import { ValidationSummary } from "./validation-summary";
import { CustomerPreview } from "./customer-preview";
import { isServerId } from "@/entities/menu";

/** Solid icon colours for the stat tiles, as the frame draws them. Tone
 *  tokens where the app has one; magenta has none, so it carries a fallback. */
const STAT_COLORS = {
  blue: "var(--octo-accent)",
  purple: "var(--octo-tone-violet-text)",
  magenta: "var(--octo-tone-pink-text, #C0158B)",
  amber: "var(--octo-tone-warning-text)",
  green: "var(--octo-tone-success-text)",
} as const;

const PREVIEW_CARDS = 3;
const SUCCESS_RETURN_MS = 3500;

function ItemCard({ item }: { item: Item }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      {/* The height lives on a wrapper: MediaTile fills its box with h-full,
          which would otherwise win over a height passed in beside it. */}
      <div className="h-[120px] w-full">
        <MediaTile
          src={resolveImage(item.image)}
          rounded="rounded-none"
          label={[item.name.slice(0, 2).toUpperCase(), ""]}
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-[14px] font-semibold text-[var(--octo-text-primary)]">{item.name}</p>
        <p className="mt-1 line-clamp-3 text-[12px] leading-[1.5] text-[var(--octo-text-secondary)]">
          {item.description}
        </p>
        <p className="mt-auto whitespace-nowrap pt-2 text-[14px] font-semibold text-[var(--octo-accent)]">
          SAR {item.pricing.price}
        </p>
      </div>
    </article>
  );
}

function SectionActions({ onEdit, onItems }: { onEdit: () => void; onItems: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label={t("menuReview.action.menu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-[8px] p-1.5 text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
      >
        <MoreVertical size={18} aria-hidden />
      </button>
      {open && (
        <>
          {/* A click anywhere else closes it — the menu is not modal. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute end-0 z-20 mt-1 w-40 overflow-hidden rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] py-1 text-start shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={onEdit}
              className="block w-full px-3 py-2 text-start text-[13.5px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            >
              {t("menuReview.action.edit")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onItems}
              className="block w-full px-3 py-2 text-start text-[13.5px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            >
              {t("menuReview.action.items")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "success" | "warning" | "danger" | "neutral"; children: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium"
      style={{
        backgroundColor: tone === "neutral" ? "var(--octo-hover)" : `var(--octo-tone-${tone}-bg)`,
        color: tone === "neutral" ? "var(--octo-text-secondary)" : `var(--octo-tone-${tone}-text)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
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

  const STATS: { key: string; value: number; icon: LucideIcon; color: string }[] = [
    // Sections the merchant made — the built-in offers section is not one.
    { key: "menuReview.stat.sections", value: liveSections.length, icon: Columns3, color: STAT_COLORS.blue },
    { key: "menuReview.stat.items", value: items.length, icon: UtensilsCrossed, color: STAT_COLORS.purple },
    { key: "menuReview.stat.modifiers", value: modifierCount, icon: ListChecks, color: STAT_COLORS.magenta },
    { key: "menuReview.stat.offers", value: offers.length, icon: BadgePercent, color: STAT_COLORS.amber },
    { key: "menuReview.stat.taxes", value: taxCount, icon: ReceiptText, color: STAT_COLORS.green },
  ];

  const DESTINATIONS: { key: string; hint: string; icon: LucideIcon }[] = [
    { key: "menuReview.dest.pos", hint: "menuReview.dest.posHint", icon: SquareMenu },
    { key: "menuReview.dest.publicLink", hint: "menuReview.dest.publicLinkHint", icon: Globe },
    { key: "menuReview.dest.tableQr", hint: "menuReview.dest.tableQrHint", icon: QrCode },
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
    return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
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

  const card = "rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4";

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {STATS.map(({ key, value, icon: Icon, color }) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-[14px] p-3 shadow-[0_2px_6px_rgba(15,23,42,0.06)]"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 7%, var(--octo-card))` }}
          >
            <span
              className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-[12px] text-white"
              style={{ backgroundColor: color }}
              aria-hidden
            >
              <Icon size={30} strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-[40px] font-semibold leading-none text-[var(--octo-text-primary)] xl:text-[44px]">
                {value}
              </span>
              <span className="mt-1 block truncate text-[15px] text-[var(--octo-text-secondary)]">{t(key)}</span>
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[var(--octo-card)] p-3 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
          <span className="min-w-0">
            <span className="block text-[22px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuReview.lastSaved")}
            </span>
            <span className="mt-0.5 block text-[15px] text-[var(--octo-text-secondary)]">
              {formatDate(draft.updatedAt, false)}
            </span>
          </span>
          <BadgeCheck size={26} className="shrink-0 text-[var(--octo-accent)]" aria-hidden />
        </div>
      </div>

      {/* Two independent columns, as the frame stacks them: the publish card
          sits straight under validation and destinations however long the
          section table on the start side grows. */}
      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.9fr)]">
        <div className="space-y-4">
          <section className={card}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
                {t("menuReview.previewTitle")}{" "}
                <span className="font-normal">({t("menuReview.previewComplete")})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                {isServerId(draft.id) && <CustomerPreview menuId={draft.id} onBeforeOpen={() => save()} />}
                <button
                  type="button"
                  onClick={() => setFullMenu(true)}
                  className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--octo-accent)] hover:underline"
                >
                  <ExternalLink size={18} aria-hidden />
                  {t("menuReview.viewFull")}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[{ id: "all", name: t("menuReview.allSections") }, ...liveSections].map((section) => (
                <button
                  key={section.id}
                  type="button"
                  aria-pressed={filter === section.id}
                  onClick={() => setFilter(section.id)}
                  className={clsx(
                    "rounded-[6px] border px-2 py-1 text-[13px]",
                    filter === section.id
                      ? "border-[var(--octo-accent)] bg-[var(--octo-selected)] text-[var(--octo-accent)]"
                      : "border-[var(--octo-border-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                  )}
                >
                  {section.name}
                </button>
              ))}
            </div>

            {previewItems.length === 0 ? (
              <p className="mt-4 rounded-[10px] border border-dashed border-[var(--octo-border-input)] p-6 text-center text-[13px] text-[var(--octo-text-muted)]">
                {t("menuReview.noItems")}
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {previewItems.slice(0, PREVIEW_CARDS).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          <section className={card}>
            <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("menuReview.overview")}</h2>
            <div className="mt-3 overflow-x-auto rounded-[10px] border border-[var(--octo-border-card)] p-2">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-[var(--octo-track)] text-[13px] text-[var(--octo-text-primary)]">
                    <th className="rounded-s-[6px] px-2 py-2 text-start font-medium">{t("menuReview.col.sections")}</th>
                    <th className="px-2 py-2 text-center font-medium">{t("menuReview.col.items")}</th>
                    <th className="px-2 py-2 text-center font-medium">{t("menuReview.col.status")}</th>
                    <th className="rounded-e-[6px] px-2 py-2 text-end font-medium">{t("menuReview.col.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--octo-border-card)]">
                  {itemSections.map((section) => {
                    // A section nobody can see is not "published", however
                    // full it is — the status column says what a customer
                    // would find. Archived reads the same as hidden.
                    const status =
                      section.visibility !== "visible"
                        ? "draft"
                        : section.entries.length === 0
                          ? "limited"
                          : "published";
                    return (
                      <tr key={section.id}>
                        <td className="px-2 py-3 text-[var(--octo-text-primary)]">{section.name}</td>
                        <td className="px-2 py-3 text-center text-[var(--octo-text-primary)]">{section.entries.length}</td>
                        <td className="px-2 py-3 text-center">
                          <StatusPill
                            tone={status === "published" ? "success" : status === "limited" ? "warning" : "neutral"}
                          >
                            {t(`menuReview.status.${status}`)}
                          </StatusPill>
                        </td>
                        <td className="px-2 py-3 text-end">
                          <SectionActions
                            onEdit={() => navigate(`/menu/${draft.id}/build/sections`)}
                            onItems={() => navigate(`/menu/${draft.id}/build/items`)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
        <div className="grid items-start gap-4 lg:grid-cols-2">
        <ValidationSummary result={result} onRefresh={() => setRun((n) => n + 1)} />

        <div className="space-y-4">
          <section className={card}>
            <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("menuReview.destinations")}</h2>
            <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">{t("menuReview.destinationsHint")}</p>
            <div className="mt-3 space-y-2.5">
              {DESTINATIONS.map(({ key, hint, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-start gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] p-3"
                >
                  <Icon size={24} className="mt-0.5 shrink-0 text-[var(--octo-text-primary)]" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">{t(key)}</span>
                      <StatusPill tone={blocked ? "danger" : "success"}>
                        {t(blocked ? "menuReview.blocked" : "menuReview.ready")}
                      </StatusPill>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-[var(--octo-text-secondary)]">{t(hint)}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={card}>
            <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("menuReview.publishSummary")}</h2>
            <ul className="mt-3 space-y-2.5">
              {SUMMARY.map((key) => (
                <li key={key} className="flex items-center justify-between text-[14px]">
                  <span className="inline-flex items-center gap-2 text-[var(--octo-text-primary)]">
                    <CircleCheck
                      size={17}
                      className={blocked ? "text-[var(--octo-text-faint)]" : "text-[var(--octo-tone-success-text)]"}
                      aria-hidden
                    />
                    {t(key)}
                  </span>
                  <span
                    className={clsx(
                      "text-[15px] font-medium",
                      blocked ? "text-[var(--octo-tone-danger-text)]" : "text-[var(--octo-tone-success-text)]"
                    )}
                  >
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
            "rounded-[16px] border-2 p-5",
            blocked
              ? "border-[var(--octo-tone-danger-text)] bg-[var(--octo-tone-danger-bg)]"
              : "border-[var(--octo-accent)] bg-[var(--octo-selected)]"
          )}
        >
          <div className="flex items-center gap-4">
            <Rocket
              size={52}
              strokeWidth={1.5}
              className={clsx("shrink-0", blocked ? "text-[var(--octo-tone-danger-text)]" : "text-[var(--octo-accent)]")}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[24px] font-bold leading-tight text-[var(--octo-text-primary)]">
                {t(blocked ? "menuReview.blockedTitle" : "menuReview.goodTitle")}
              </p>
              <p className="mt-1 text-[16px] text-[var(--octo-text-secondary)]">
                {t(blocked ? "menuReview.blockedBody" : "menuReview.goodBody")}
              </p>
            </div>
          </div>
          {publishError && (
            <p role="alert" className="mt-3 rounded-[10px] bg-error/10 px-3 py-2 text-[13px] text-error">
              {publishError}
            </p>
          )}
          {/* Disabled with the reason above it, never a silently dead button. */}
          <button
            type="button"
            disabled={blocked || publishing}
            onClick={() => void publish()}
            className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-[10px] bg-[var(--octo-accent)] text-[18px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("menuReview.publish")}
            <Rocket size={22} aria-hidden />
          </button>
        </section>
        </div>
      </div>

      <section className="mt-5 grid gap-4 rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:rtl:divide-x-reverse xl:divide-[var(--octo-border-card)]">
        {[
          { icon: ShieldCheck, title: "menuReview.safeTitle", body: t("menuReview.safeBody") },
          { icon: Clock, title: "menuReview.lastPublish", body: formatDate(draft.publishedAt) },
          { icon: CloudUpload, title: "menuReview.version", body: `V${draft.version}` },
          {
            icon: User,
            title: "menuReview.publishedBy",
            // The session's own user — the only person this console knows
            // could have pressed Publish.
            body: draft.publishedAt ? (user?.name ?? t("menuReview.never")) : t("menuReview.never"),
          },
        ].map(({ icon: Icon, title, body }, i) => (
          <div key={title} className={clsx("flex items-center gap-3", i > 0 && "xl:ps-4")}>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--octo-selected)] text-[var(--octo-accent)]">
              <Icon size={24} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] font-semibold text-[var(--octo-text-primary)]">{t(title)}</span>
              <span className="block text-[13.5px] text-[var(--octo-text-secondary)]">{body}</span>
            </span>
          </div>
        ))}
      </section>

      <Modal
        open={fullMenu}
        onClose={() => setFullMenu(false)}
        title={`${t("menuReview.previewTitle")} (${t("menuReview.previewComplete")})`}
        className="max-w-5xl"
      >
        <div className="octo-scroll max-h-[70vh] space-y-5 overflow-y-auto pe-1">
          {itemSections.map((section) => {
            const list = (section.entries as Item[]).filter((item) => item.name.trim() !== "");
            if (list.length === 0) return null;
            return (
              <div key={section.id}>
                <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
                  {section.name} <span className="font-normal text-[var(--octo-text-muted)]">({list.length})</span>
                </h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="p-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("menuReview.noItems")}</p>
          )}
        </div>
      </Modal>

      <Modal
        open={published}
        onClose={() => navigate("/menu")}
        className="max-w-md text-center"
        footer={
          <button
            type="button"
            onClick={() => navigate("/menu")}
            className="h-11 w-full rounded-[10px] bg-[var(--octo-accent)] text-[15px] font-semibold text-white hover:brightness-110"
          >
            {t("menuReview.backToLibrary")}
          </button>
        }
      >
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]">
          <PartyPopper size={30} aria-hidden />
        </span>
        <p className="mt-3 text-[20px] font-bold text-[var(--octo-text-primary)]" role="status">
          {t("menuReview.publishedTitle")}
        </p>
        <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{t("menuReview.publishedBody")}</p>
      </Modal>
    </>
  );
}
