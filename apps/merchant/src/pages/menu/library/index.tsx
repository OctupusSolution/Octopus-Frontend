// The menu library: the merchant's list of menus, with the filters and the two
// creation entry points.
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Button, Modal } from "@ui/primitives";
import {
  DEFAULT_FILTERS,
  SEED_BRANCHES,
  filterMenus,
  useMenuLibrary,
  type LibraryFilters,
  type Menu,
  type MenuSchedule,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { MenuCard, type CardAction } from "./menu-card";
import { ActionsMenu } from "./actions-menu";
import { ScheduleModal } from "./schedule-modal";
import { VersionsModal } from "./versions-modal";
import { AccessCodesModal } from "./access-codes-modal";
import { BulkPriceModal } from "./bulk-price-modal";
import { MenuIcon } from "../_shared/menu-icon";
import { BIG_OUTLINE, BIG_PRIMARY, ERROR_STRIP, FOCUS, FOCUS_WITHIN, INFO_STRIP, TEXT, TEXT_SECONDARY } from "../_shared/theme";

// The filter row's outline is one step lighter (#e2e8f0) than the cards'.
const LINE_SOFT = "border-[#e2e8f0] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";

/** A filter dropdown as the frame draws it: 40px, 8px radius, hugging its
 *  label. */
function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          "h-10 appearance-none rounded-[8px] border bg-[var(--octo-card)] pe-12 ps-4 text-[14px] leading-[14px]",
          LINE_SOFT,
          TEXT_SECONDARY,
          FOCUS
        )}
      >
        {children}
      </select>
      <MenuIcon
        name="menu-arrow-down.svg"
        size={24}
        className={clsx("pointer-events-none absolute end-4 top-1/2 -translate-y-1/2", TEXT_SECONDARY)}
      />
    </div>
  );
}

export function MenuLibraryPage() {
  const { t, locale } = useI18n();
  const today = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const navigate = useNavigate();
  const lib = useMenuLibrary();
  const { menus } = lib;
  const [actionError, setActionError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [actionsFor, setActionsFor] = useState<{ menu: Menu; anchor: DOMRect } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Menu | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState<Menu | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Menu | null>(null);
  const [versionsFor, setVersionsFor] = useState<Menu | null>(null);
  const [accessCodeFor, setAccessCodeFor] = useState<Menu | null>(null);
  const [bulkPriceFor, setBulkPriceFor] = useState<Menu | null>(null);

  const visible = useMemo(() => filterMenus(menus, filters), [menus, filters]);
  const branchLabel =
    SEED_BRANCHES.find((b) => b.id === menus[0]?.branchId)?.label ?? SEED_BRANCHES[0].label;

  function patch(next: Partial<LibraryFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  async function guard(p: Promise<unknown>) {
    setActionError(null);
    try {
      await p;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "error");
    }
  }

  // Every kebab choice routes through here rather than each menu item owning
  // its own handler, so "which menu is this acting on" is answered once.
  //
  // The kebab only offers the frame's six actions today; the remaining cases
  // stay wired so the features behind them come back by listing them again.
  function runAction(action: CardAction) {
    const menu = actionsFor?.menu ?? null;
    setActionsFor(null);
    if (!menu) return;

    switch (action) {
      case "edit":
        navigate(`/menu/${menu.id}/build/sections`);
        return;
      case "schedule":
        setScheduleFor(menu);
        return;
      case "versions":
        setVersionsFor(menu);
        return;
      case "accessCode":
        setAccessCodeFor(menu);
        return;
      case "bulkPrice":
        setBulkPriceFor(menu);
        return;
      case "hold":
        void guard(lib.hold(menu));
        return;
      case "resume":
        void guard(lib.release(menu));
        return;
      case "duplicate":
        void guard(lib.duplicate(menu));
        return;
      case "unpublish":
        // Takes the menu offline everywhere it's live — confirm before doing it,
        // same as delete.
        setConfirmUnpublish(menu);
        return;
      case "archive":
        void guard(menu.status === "archived" ? lib.restore(menu) : lib.archive(menu));
        return;
      case "delete":
        // Never deletes straight from the kebab — the confirm owns that.
        setConfirmDelete(menu);
        return;
    }
  }

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h1 className="text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">{t("menuLib.title")}</h1>
          <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SECONDARY)}>{t("menuLib.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Today's date, as the frame shows it on every screen in this
              module. Read-only: it dates what the merchant is looking at, it
              does not filter it. */}
          <span className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#f1f5f9] p-2 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)] [[data-theme=dark]_&]:bg-[var(--octo-track)]">
            <MenuIcon name="menu-calendar.svg" size={24} />
            {today}
          </span>
          <button type="button" onClick={() => navigate("/menu/import")} className={BIG_OUTLINE}>
            <MenuIcon name="menu-import.svg" size={24} />
            {t("menuLib.importAi")}
          </button>
          <button type="button" onClick={() => navigate("/menu/new")} className={BIG_PRIMARY}>
            <MenuIcon name="menu-plus.svg" size={24} />
            {t("menuLib.createNew")}
          </button>
        </div>
      </header>

      <div className={clsx("mt-6 flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-[8px] px-3 py-2", INFO_STRIP)}>
        <p className="inline-flex items-center gap-2 text-[14px] font-medium leading-[14px]">
          <MenuIcon name="menu-info-circle.svg" size={24} />
          {t("menuLib.branchBanner").replace("{branch}", branchLabel)}
        </p>
        <button
          type="button"
          onClick={() => navigate("/settings/branches")}
          className="text-[14px] font-bold leading-[14px] underline"
        >
          {t("menuLib.changeBranch")}
        </button>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <label
          className={clsx(
            "flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-[12px] border bg-[var(--octo-card)] px-4",
            LINE_SOFT,
            FOCUS_WITHIN
          )}
        >
          <MenuIcon name="menu-search.svg" size={24} className="text-[var(--octo-text-primary)]" />
          <input
            type="search"
            aria-label={t("menuLib.search")}
            placeholder={t("menuLib.search")}
            value={filters.query}
            onChange={(e) => patch({ query: e.target.value })}
            className={clsx("h-full min-w-0 flex-1 bg-transparent text-[14px] leading-[14px] outline-none placeholder:text-[#687280]", TEXT)}
          />
        </label>
        <FilterSelect ariaLabel={t("menuLib.allAreas")} value={filters.area} onChange={(area) => patch({ area })}>
          <option value="all">{t("menuLib.allAreas")}</option>
          {SEED_BRANCHES.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.label}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          ariaLabel={t("menuLib.allChannels")}
          value={filters.channel}
          onChange={(channel) => patch({ channel: channel as LibraryFilters["channel"] })}
        >
          <option value="all">{t("menuLib.allChannels")}</option>
          <option value="pos">{t("menuLib.channel.pos")}</option>
          <option value="publicLink">{t("menuLib.channel.publicLink")}</option>
          <option value="tableQr">{t("menuLib.channel.tableQr")}</option>
        </FilterSelect>
        <FilterSelect
          ariaLabel={t("menuLib.sort.recent")}
          value={filters.sort}
          onChange={(sort) => patch({ sort: sort as LibraryFilters["sort"] })}
        >
          <option value="recent">{t("menuLib.sort.recent")}</option>
          <option value="name">{t("menuLib.sort.name")}</option>
          <option value="status">{t("menuLib.sort.status")}</option>
        </FilterSelect>
      </div>

      {(lib.error || actionError) && (
        <div
          role="alert"
          className={clsx("mt-6 flex min-h-10 items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-[14px] font-medium", ERROR_STRIP)}
        >
          <span>{actionError ?? lib.error}</span>
          {lib.error && (
            <button type="button" className="font-bold underline" onClick={lib.reload}>
              Retry
            </button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        menus.length === 0 ? (
          // A first-run merchant, or one who deleted everything. The spec asks
          // for the two creation entry points here; they lead to /menu/new
          // rather than being redrawn inline, so the two cards have one home.
          <div className="mt-12 flex flex-col items-center text-center">
            <h2 className="text-[20px] font-semibold leading-5 text-[var(--octo-text-primary)]">
              {t("menuLib.empty.title")}
            </h2>
            <p className={clsx("mt-3 max-w-[420px] text-[14px] font-medium leading-[18px]", TEXT_SECONDARY)}>
              {t("menuLib.empty.body")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={() => navigate("/menu/import")} className={BIG_OUTLINE}>
                <MenuIcon name="menu-import.svg" size={24} />
                {t("menuLib.importAi")}
              </button>
              <button type="button" onClick={() => navigate("/menu/new")} className={BIG_PRIMARY}>
                <MenuIcon name="menu-plus.svg" size={24} />
                {t("menuLib.createNew")}
              </button>
            </div>
          </div>
        ) : (
          <p className={clsx("mt-10 text-center text-[14px] font-medium", TEXT_SECONDARY)}>
            {t("menuLib.noMatches")}
          </p>
        )
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((menu: Menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              onOpenActions={(m, anchor) => setActionsFor({ menu: m, anchor })}
            />
          ))}
        </div>
      )}

      <ActionsMenu
        menu={actionsFor?.menu ?? null}
        anchor={actionsFor?.anchor ?? null}
        onClose={() => setActionsFor(null)}
        onPick={runAction}
      />

      <ScheduleModal
        menu={scheduleFor}
        menus={menus}
        onClose={() => setScheduleFor(null)}
        onSave={(schedule: MenuSchedule, channels: Menu["channels"]) => {
          if (scheduleFor) void guard(lib.setSchedule(scheduleFor, schedule, channels));
          setScheduleFor(null);
        }}
      />

      <VersionsModal menu={versionsFor} onClose={() => setVersionsFor(null)} onRepublished={lib.reload} />

      <AccessCodesModal menu={accessCodeFor} onClose={() => setAccessCodeFor(null)} />

      <BulkPriceModal menu={bulkPriceFor} onClose={() => setBulkPriceFor(null)} />

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t("menuLib.confirmDelete.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {t("menuLib.confirmDelete.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) void guard(lib.remove(confirmDelete));
                setConfirmDelete(null);
              }}
            >
              {t("menuLib.confirmDelete.confirm")}
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-[var(--octo-text-secondary)]">
          {t("menuLib.confirmDelete.body").replace("{name}", confirmDelete?.name ?? "")}
        </p>
      </Modal>

      <Modal
        open={confirmUnpublish !== null}
        onClose={() => setConfirmUnpublish(null)}
        title={t("menuLib.confirmUnpublish.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmUnpublish(null)}>
              {t("menuLib.confirmUnpublish.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmUnpublish) void guard(lib.unpublish(confirmUnpublish));
                setConfirmUnpublish(null);
              }}
            >
              {t("menuLib.confirmUnpublish.confirm")}
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-[var(--octo-text-secondary)]">
          {t("menuLib.confirmUnpublish.body").replace("{name}", confirmUnpublish?.name ?? "")}
        </p>
      </Modal>
    </div>
  );
}
