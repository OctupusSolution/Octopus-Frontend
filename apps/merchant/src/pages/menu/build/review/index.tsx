// Step 4 — Review & Publish.
//
// Every number on this screen is derived from the draft, and the validation
// summary is validate() over it. Nothing here is a fixture, which is the whole
// point: the merchant is deciding whether to go live on what it says.
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  LayoutGrid,
  Percent,
  Receipt,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@ui/primitives";
import {
  OFFERS_SECTION_ID,
  channelStateFor,
  entryCount,
  sectionCount,
  validate,
  type Item,
  type Offer,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDraft } from "../use-draft";
import { ValidationSummary } from "./validation-summary";

export function ReviewStep() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { draft, setDraft, save } = useDraft();

  const result = validate(draft);
  const blocked = result.errors.length > 0;

  const itemSections = draft.sections.filter((s) => s.id !== OFFERS_SECTION_ID);
  const items = itemSections.flatMap((s) => s.entries as Item[]);
  const offers = (draft.sections.find((s) => s.id === OFFERS_SECTION_ID)?.entries ??
    []) as unknown as Offer[];

  const modifierCount = items.reduce((n, item) => n + item.modifierGroups.length, 0);
  // Distinct VAT rates in use — "how many tax settings does this menu carry",
  // which is what the tile is asking, not how many items have one.
  const taxCount = new Set(items.map((item) => item.pricing.vatRate)).size;

  const STATS = [
    { key: "menuReview.stat.sections", value: sectionCount(draft), icon: LayoutGrid, tone: "info" },
    { key: "menuReview.stat.items", value: entryCount(draft), icon: UtensilsCrossed, tone: "violet" },
    { key: "menuReview.stat.modifiers", value: modifierCount, icon: SlidersHorizontal, tone: "danger" },
    { key: "menuReview.stat.offers", value: offers.length, icon: Percent, tone: "gold" },
    { key: "menuReview.stat.taxes", value: taxCount, icon: Receipt, tone: "success" },
  ] as const;

  const DESTINATIONS = [
    { key: "menuReview.dest.pos", hint: "menuReview.dest.posHint", icon: Receipt },
    { key: "menuReview.dest.publicLink", hint: "menuReview.dest.publicLinkHint", icon: ExternalLink },
    { key: "menuReview.dest.tableQr", hint: "menuReview.dest.tableQrHint", icon: UploadCloud },
  ];

  const SUMMARY = [
    "menuReview.sum.data",
    "menuReview.sum.images",
    "menuReview.sum.prices",
    "menuReview.sum.taxes",
    "menuReview.sum.modifiers",
    "menuReview.sum.offers",
  ];

  function formatDate(iso: string | null): string {
    if (!iso) return t("menuReview.never");
    return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  /** Going live: the menu and every channel it serves flip together, because a
   *  published menu that is live nowhere would be a lie the library card told. */
  function publish() {
    const now = new Date().toISOString();
    const live = channelStateFor("active");
    const published = {
      ...draft,
      status: "active" as const,
      channels: { pos: live, publicLink: live, tableQr: live },
      publishedAt: now,
      updatedAt: now,
      version: draft.version + 1,
    };
    setDraft(published);
    save(published);
    navigate("/menu");
  }

  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {STATS.map(({ key, value, icon: Icon, tone }) => (
          <div
            key={key}
            className="flex items-center gap-2.5 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px]"
              style={{
                backgroundColor: `var(--octo-tone-${tone}-bg)`,
                color: `var(--octo-tone-${tone}-text)`,
              }}
              aria-hidden
            >
              <Icon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-[19px] font-semibold text-[var(--octo-text-primary)]">
                {value}
              </span>
              <span className="block truncate text-[12.5px] text-[var(--octo-text-secondary)]">
                {t(key)}
              </span>
            </span>
          </div>
        ))}
        <div className="rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3">
          <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
            {t("menuReview.lastSaved")}
          </p>
          <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-secondary)]">
            {formatDate(draft.updatedAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,0.9fr)]">
        <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuReview.overview")}
          </h2>
          <table className="mt-3 w-full text-[14px]">
            <thead>
              <tr className="border-b border-[var(--octo-border-card)] text-start text-[12.5px] text-[var(--octo-text-secondary)]">
                <th className="pb-2 text-start font-medium">{t("menuReview.col.sections")}</th>
                <th className="pb-2 text-start font-medium">{t("menuReview.col.items")}</th>
                <th className="pb-2 text-start font-medium">{t("menuReview.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {itemSections.map((section) => {
                // A section nobody can see is not "published", however full it
                // is — the status column says what a customer would find.
                const status =
                  section.visibility === "hidden"
                    ? "draft"
                    : section.entries.length === 0
                      ? "limited"
                      : "published";
                return (
                  <tr key={section.id} className="border-b border-[var(--octo-border-card)]">
                    <td className="py-2.5 text-[var(--octo-text-primary)]">{section.name}</td>
                    <td className="py-2.5 text-[var(--octo-text-secondary)]">
                      {section.entries.length}
                    </td>
                    <td className="py-2.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
                        style={{
                          backgroundColor:
                            status === "published"
                              ? "var(--octo-tone-success-bg)"
                              : status === "limited"
                                ? "var(--octo-tone-warning-bg)"
                                : "var(--octo-hover)",
                          color:
                            status === "published"
                              ? "var(--octo-tone-success-text)"
                              : status === "limited"
                                ? "var(--octo-tone-warning-text)"
                                : "var(--octo-text-secondary)",
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                        {t(`menuReview.status.${status}`)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <ValidationSummary result={result} />

        <div className="space-y-4">
          <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
            <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuReview.destinations")}
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--octo-text-secondary)]">
              {t("menuReview.destinationsHint")}
            </p>
            <div className="mt-2.5 space-y-2.5">
              {DESTINATIONS.map(({ key, hint, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-start gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] p-2.5"
                >
                  <Icon size={17} className="mt-0.5 shrink-0 text-[var(--octo-text-secondary)]" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-[var(--octo-text-primary)]">
                      {t(key)}
                    </span>
                    <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
                      {t(hint)}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium"
                    style={{
                      backgroundColor: blocked
                        ? "var(--octo-tone-danger-bg)"
                        : "var(--octo-tone-success-bg)",
                      color: blocked
                        ? "var(--octo-tone-danger-text)"
                        : "var(--octo-tone-success-text)",
                    }}
                  >
                    {t(blocked ? "menuReview.blocked" : "menuReview.ready")}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
            <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuReview.publishSummary")}
            </h2>
            <ul className="mt-2.5 space-y-2">
              {SUMMARY.map((key) => (
                <li key={key} className="flex items-center justify-between text-[14px]">
                  <span className="inline-flex items-center gap-2 text-[var(--octo-text-primary)]">
                    <CheckCircle2
                      size={16}
                      className={clsx(
                        blocked ? "text-[var(--octo-text-faint)]" : "text-[var(--octo-tone-success-text)]"
                      )}
                      aria-hidden
                    />
                    {t(key)}
                  </span>
                  <span
                    className={clsx(
                      "font-medium",
                      blocked
                        ? "text-[var(--octo-text-secondary)]"
                        : "text-[var(--octo-tone-success-text)]"
                    )}
                  >
                    {t(blocked ? "menuReview.blocked" : "menuReview.ready")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className={clsx(
              "rounded-[14px] border p-4",
              blocked
                ? "border-[var(--octo-border-card)] bg-[var(--octo-card)]"
                : "border-[var(--octo-accent)] bg-[var(--octo-selected)]"
            )}
          >
            <p className="inline-flex items-center gap-2 text-[17px] font-semibold text-[var(--octo-text-primary)]">
              <Rocket size={20} aria-hidden />
              {t(blocked ? "menuReview.blockedTitle" : "menuReview.goodTitle")}
            </p>
            <p className="mt-1 text-[13.5px] text-[var(--octo-text-secondary)]">
              {t(blocked ? "menuReview.blockedBody" : "menuReview.goodBody")}
            </p>
            {/* Disabled with the reason above it, never a silently dead button. */}
            <Button className="mt-3 w-full justify-center py-2.5" disabled={blocked} onClick={publish}>
              {t("menuReview.publish")}
            </Button>
          </section>
        </div>
      </div>

      <section className="mt-4 grid gap-4 rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[var(--octo-accent)]" aria-hidden />
          <span>
            <span className="block text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuReview.safeTitle")}
            </span>
            <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
              {t("menuReview.safeBody")}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Clock size={20} className="mt-0.5 shrink-0 text-[var(--octo-accent)]" aria-hidden />
          <span>
            <span className="block text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuReview.lastPublish")}
            </span>
            <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
              {formatDate(draft.publishedAt)}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <UploadCloud size={20} className="mt-0.5 shrink-0 text-[var(--octo-accent)]" aria-hidden />
          <span>
            <span className="block text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuReview.version")}
            </span>
            <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
              V{draft.version}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <User size={20} className="mt-0.5 shrink-0 text-[var(--octo-accent)]" aria-hidden />
          <span>
            <span className="block text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuReview.publishedBy")}
            </span>
            <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
              {draft.publishedAt ? "Omar Al-Harbi" : t("menuReview.never")}
            </span>
          </span>
        </div>
      </section>
    </>
  );
}
