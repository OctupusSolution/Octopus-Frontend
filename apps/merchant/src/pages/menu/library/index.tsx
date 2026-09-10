// The menu library: the merchant's list of menus, with the filters and the two
// creation entry points. Card actions arrive in the next task — `onOpenActions`
// is threaded through now so the card's contract does not change later.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Info, Search, Sparkles, Plus } from "lucide-react";
import { Button, Input, Modal, Select } from "@ui/primitives";
import {
  DEFAULT_FILTERS,
  SEED_BRANCHES,
  deleteMenu,
  duplicateMenu,
  filterMenus,
  setMenuSchedule,
  setMenuStatus,
  useMenuLibrary,
  type LibraryFilters,
  type Menu,
  type MenuSchedule,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { MenuCard, type CardAction } from "./menu-card";
import { ActionsMenu } from "./actions-menu";
import { ScheduleModal } from "./schedule-modal";

export function MenuLibraryPage() {
  const { t, locale } = useI18n();
  const today = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const navigate = useNavigate();
  const { menus, setMenus } = useMenuLibrary();
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [actionsFor, setActionsFor] = useState<{ menu: Menu; anchor: DOMRect } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Menu | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Menu | null>(null);

  const visible = useMemo(() => filterMenus(menus, filters), [menus, filters]);
  const branchLabel =
    SEED_BRANCHES.find((b) => b.id === menus[0]?.branchId)?.label ?? SEED_BRANCHES[0].label;

  function patch(next: Partial<LibraryFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  // Every kebab choice routes through here rather than each menu item owning
  // its own handler, so "which menu is this acting on" is answered once.
  function runAction(action: CardAction) {
    const menu = actionsFor?.menu ?? null;
    setActionsFor(null);
    if (!menu) return;

    const now = new Date().toISOString();
    switch (action) {
      case "edit":
        navigate(`/menu/${menu.id}/build/sections`);
        return;
      case "schedule":
        setScheduleFor(menu);
        return;
      case "hold":
        setMenus(setMenuStatus(menus, menu.id, "on-hold", now));
        return;
      case "resume":
        setMenus(setMenuStatus(menus, menu.id, "active", now));
        return;
      case "duplicate":
        setMenus(duplicateMenu(menus, menu.id, `${menu.id}-copy-${Date.now()}`, now));
        return;
      case "archive":
        setMenus(setMenuStatus(menus, menu.id, "archived", now));
        return;
      case "delete":
        // Never deletes straight from the kebab — the confirm owns that.
        setConfirmDelete(menu);
        return;
    }
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--octo-text-primary)]">{t("menuLib.title")}</h1>
          <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{t("menuLib.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Today's date, as the frame shows it on every screen in this
              module. Read-only: it dates what the merchant is looking at, it
              does not filter it. */}
          <span className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--octo-track)] px-3 py-[7px] text-[13px] font-medium text-[var(--octo-text-secondary)]">
            <CalendarDays size={15} className="text-[var(--octo-text-muted)]" aria-hidden />
            {today}
          </span>
          {/* The AI branch is deferred, not dead. It navigates to a real page
              that says so. A disabled button beside the primary action reads as
              a broken build rather than as a roadmap. */}
          <Button
            variant="secondary"
            onClick={() => navigate("/menu/import")}
            icon={<Sparkles size={16} aria-hidden />}
          >
            {t("menuLib.importAi")}
          </Button>
          <Button onClick={() => navigate("/menu/new")} icon={<Plus size={16} aria-hidden />}>
            {t("menuLib.createNew")}
          </Button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--octo-info-soft,var(--octo-hover))] px-3.5 py-2.5">
        <p className="inline-flex items-center gap-2 text-[14px] text-[var(--octo-accent)]">
          <Info size={16} aria-hidden />
          {t("menuLib.branchBanner").replace("{branch}", branchLabel)}
        </p>
        <button type="button" className="text-[14px] font-semibold text-[var(--octo-accent)] underline">
          {t("menuLib.changeBranch")}
        </button>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input
          icon={<Search size={16} aria-hidden />}
          placeholder={t("menuLib.search")}
          value={filters.query}
          onChange={(e) => patch({ query: e.target.value })}
        />
        <Select value={filters.area} onChange={(e) => patch({ area: e.target.value })}>
          <option value="all">{t("menuLib.allAreas")}</option>
          {SEED_BRANCHES.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.label}</option>
          ))}
        </Select>
        <Select
          value={filters.channel}
          onChange={(e) => patch({ channel: e.target.value as LibraryFilters["channel"] })}
        >
          <option value="all">{t("menuLib.allChannels")}</option>
          <option value="pos">{t("menuLib.channel.pos")}</option>
          <option value="publicLink">{t("menuLib.channel.publicLink")}</option>
          <option value="tableQr">{t("menuLib.channel.tableQr")}</option>
        </Select>
        <Select
          value={filters.sort}
          onChange={(e) => patch({ sort: e.target.value as LibraryFilters["sort"] })}
        >
          <option value="recent">{t("menuLib.sort.recent")}</option>
          <option value="name">{t("menuLib.sort.name")}</option>
          <option value="status">{t("menuLib.sort.status")}</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        menus.length === 0 ? (
          // A first-run merchant, or one who deleted everything. The spec asks
          // for the two creation entry points here; they lead to /menu/new
          // rather than being redrawn inline, so the two cards have one home.
          <div className="mt-12 text-center">
            <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuLib.empty.title")}
            </h2>
            <p className="mx-auto mt-1.5 max-w-[420px] text-[14px] text-[var(--octo-text-secondary)]">
              {t("menuLib.empty.body")}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <Button onClick={() => navigate("/menu/new")} icon={<Plus size={16} aria-hidden />}>
                {t("menuLib.createNew")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/menu/import")}
                icon={<Sparkles size={16} aria-hidden />}
              >
                {t("menuLib.importAi")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-10 text-center text-[14px] text-[var(--octo-text-secondary)]">
            {t("menuLib.noMatches")}
          </p>
        )
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          if (scheduleFor) {
            const now = new Date().toISOString();
            const rescheduled = setMenuSchedule(menus, scheduleFor.id, schedule, now);
            setMenus(
              rescheduled.map((m) => (m.id === scheduleFor.id ? { ...m, channels } : m))
            );
          }
          setScheduleFor(null);
        }}
      />

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
                if (confirmDelete) setMenus(deleteMenu(menus, confirmDelete.id));
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
    </div>
  );
}
