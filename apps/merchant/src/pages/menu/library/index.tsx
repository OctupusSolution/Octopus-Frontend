// The menu library: the merchant's list of menus, with the filters and the two
// creation entry points. Card actions arrive in the next task — `onOpenActions`
// is threaded through now so the card's contract does not change later.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, FolderDown, Info, Search, Settings2, Sparkles, Plus } from "lucide-react";
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
import { VersionsModal } from "./versions-modal";
import { AccessCodesModal } from "./access-codes-modal";
import { BulkPriceModal } from "./bulk-price-modal";
import { BulkTextModal } from "./bulk-text-modal";
import { MenuSettingsModal } from "./menu-settings-modal";
import { useMenuCopy } from "../copy";

export function MenuLibraryPage() {
  const { t, locale } = useI18n();
  const c = useMenuCopy();
  const today = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const navigate = useNavigate();
  const lib = useMenuLibrary();
  const { menus, setMenus } = lib;
  const [actionError, setActionError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [actionsFor, setActionsFor] = useState<{ menu: Menu; anchor: DOMRect } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Menu | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState<Menu | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Menu | null>(null);
  const [versionsFor, setVersionsFor] = useState<Menu | null>(null);
  const [accessCodeFor, setAccessCodeFor] = useState<Menu | null>(null);
  const [bulkPriceFor, setBulkPriceFor] = useState<Menu | null>(null);
  const [bulkTextOpen, setBulkTextOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--octo-text-primary)]">{t("menuLib.title")}</h1>
          <p className="mt-1 text-[15px] text-[var(--octo-text-secondary)]">{t("menuLib.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Today's date, as the frame shows it on every screen in this
              module. Read-only: it dates what the merchant is looking at, it
              does not filter it. */}
          <span className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--octo-track)] px-3 py-[7px] text-[13px] font-medium text-[var(--octo-text-secondary)]">
            <CalendarDays size={15} className="text-[var(--octo-text-muted)]" aria-hidden />
            {today}
          </span>
          <Button
            variant="secondary"
            onClick={() => setSettingsOpen(true)}
            icon={<Settings2 size={18} aria-hidden />}
            className="h-11 px-4 text-[15px] font-semibold"
          >
            {c("settings.open")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setBulkTextOpen(true)}
            icon={<Search size={18} aria-hidden />}
            className="h-11 px-4 text-[15px] font-semibold"
          >
            {t("bulkText.openButton")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/menu/import")}
            icon={<FolderDown size={18} aria-hidden />}
            // The primitive has no merge step, so the variant's grey border and
            // text would win on stylesheet order without the important flag.
            className="h-11 !border-[var(--octo-accent)] px-4 text-[15px] font-semibold !text-[var(--octo-accent)]"
          >
            {t("menuLib.importAi")}
          </Button>
          <Button
            onClick={() => navigate("/menu/new")}
            icon={<Plus size={18} aria-hidden />}
            className="h-11 px-4 text-[15px] font-semibold"
          >
            {t("menuLib.createNew")}
          </Button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--octo-info-soft,var(--octo-hover))] px-3.5 py-2.5">
        <p className="inline-flex items-center gap-2 text-[14px] text-[var(--octo-accent)]">
          <Info size={16} aria-hidden />
          {t("menuLib.branchBanner").replace("{branch}", branchLabel)}
        </p>
        <button
          type="button"
          onClick={() => navigate("/settings/branches")}
          className="text-[14px] font-semibold text-[var(--octo-accent)] underline"
        >
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

      {(lib.error || actionError) && (
        <div role="alert" className="mt-4 flex items-center justify-between rounded-[10px] bg-error/10 px-4 py-3 text-[14px] text-error">
          <span>{actionError ?? lib.error}</span>
          {lib.error && (
            <button type="button" className="underline" onClick={lib.reload}>
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
          if (scheduleFor) void guard(lib.setSchedule(scheduleFor, schedule, channels));
          setScheduleFor(null);
        }}
      />

      <VersionsModal menu={versionsFor} onClose={() => setVersionsFor(null)} onRepublished={lib.reload} />

      <AccessCodesModal menu={accessCodeFor} onClose={() => setAccessCodeFor(null)} />

      <BulkPriceModal menu={bulkPriceFor} onClose={() => setBulkPriceFor(null)} />

      <BulkTextModal open={bulkTextOpen} onClose={() => setBulkTextOpen(false)} />

      <MenuSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

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
