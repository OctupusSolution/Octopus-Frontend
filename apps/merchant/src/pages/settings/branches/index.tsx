import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronRight, CircleCheck, MapPin, Plus, Search, X } from "lucide-react";
import { Badge, Button, Input, Modal, Select } from "@ui/primitives";
import { StatCard } from "@/widgets/sales-summary-chart";
import { branches, branchKpis, type Branch, type BranchStatus, type BranchType, type TableStatus, type DayKey } from "@/shared/api/mock-settings-branches";
import { useI18n } from "@/app/providers/i18n-provider";

const TYPE_KEY: Record<BranchType, string> = {
  "Dine-in": "settings.branchType.dineIn",
  "Cloud Kitchen": "settings.branchType.cloudKitchen",
  "Drive-thru": "settings.branchType.driveThru",
  Kiosk: "settings.branchType.kiosk",
};

const STATUS_TONE: Record<BranchStatus, "success" | "neutral"> = { Active: "success", Inactive: "neutral" };
const STATUS_KEY: Record<BranchStatus, string> = {
  Active: "settings.branches.status.active",
  Inactive: "settings.branches.status.inactive",
};

const TABLE_DOT: Record<TableStatus, string> = {
  Available: "bg-[#22C55E]",
  Reserved: "bg-[#F59E0B]",
  Occupied: "bg-[#EF4444]",
};
const TABLE_KEY: Record<TableStatus, string> = {
  Available: "settings.branches.table.available",
  Reserved: "settings.branches.table.reserved",
  Occupied: "settings.branches.table.occupied",
};

const DAY_ORDER: readonly DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_KEY: Record<DayKey, string> = {
  sun: "settings.branches.day.sun",
  mon: "settings.branches.day.mon",
  tue: "settings.branches.day.tue",
  wed: "settings.branches.day.wed",
  thu: "settings.branches.day.thu",
  fri: "settings.branches.day.fri",
  sat: "settings.branches.day.sat",
};

function tableCount(branch: Branch): number {
  return branch.sections.reduce((sum, s) => sum + s.tables.length, 0);
}

function Drawer({
  branch, onClose, onToggleStatus, onNotify,
}: {
  branch: Branch | null;
  onClose: () => void;
  onToggleStatus: (next: BranchStatus) => void;
  onNotify: (msg: string) => void;
}) {
  const { t } = useI18n();

  return (
    <Modal
      open={branch !== null}
      onClose={onClose}
      title={
        branch && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[var(--octo-text-primary)]">{branch.nameEn}</p>
              <p className="text-[11px] text-[var(--octo-text-muted)]" dir="rtl">{branch.nameAr}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("settings.branches.close")}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <X size={15} />
            </button>
          </div>
        )
      }
      footer={
        <div className="flex items-center gap-2">
          {branch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(branch.status === "Active" ? "Inactive" : "Active")}
            >
              {t(branch.status === "Active" ? "settings.branches.deactivate" : "settings.branches.activate")}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => branch && onNotify(t("settings.branches.editNote"))}>
            {t("settings.branches.edit")}
          </Button>
        </div>
      }
    >
      {branch && (
        <div className="octo-scroll max-h-[60vh] overflow-y-auto pe-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[branch.status]}>{t(STATUS_KEY[branch.status])}</Badge>
            <Badge tone="neutral">{t(TYPE_KEY[branch.type])}</Badge>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[12px] text-[var(--octo-text-secondary)]">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--octo-text-faint)]" />
            {branch.address}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[9px] bg-[var(--octo-hover)] px-3 py-2 text-center">
              <p className="text-[16px] font-bold text-[var(--octo-text-primary)]">{branch.sections.length}</p>
              <p className="text-[10.5px] uppercase tracking-wide text-[var(--octo-text-muted)]">{t("settings.branches.col.sections")}</p>
            </div>
            <div className="rounded-[9px] bg-[var(--octo-hover)] px-3 py-2 text-center">
              <p className="text-[16px] font-bold text-[var(--octo-text-primary)]">{tableCount(branch)}</p>
              <p className="text-[10.5px] uppercase tracking-wide text-[var(--octo-text-muted)]">{t("settings.branches.col.tables")}</p>
            </div>
            <div className="rounded-[9px] bg-[var(--octo-hover)] px-3 py-2 text-center">
              <p className="text-[16px] font-bold text-[var(--octo-text-primary)]">{branch.staff}</p>
              <p className="text-[10.5px] uppercase tracking-wide text-[var(--octo-text-muted)]">{t("settings.branches.col.staff")}</p>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("settings.branches.sections")}
            </h3>
            <div className="mt-2 flex flex-col gap-2.5">
              {branch.sections.map((section) => (
                <div key={section.name} className="rounded-[9px] border border-[var(--octo-border-card)] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{section.name}</p>
                    <p className="text-[11px] text-[var(--octo-text-faint)]">
                      {t("settings.branches.capacity").replace("{n}", String(section.capacity))}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {section.tables.map((table) => (
                      <span
                        key={`${section.name}-${table.name}`}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--octo-border-card)] px-1.5 py-1 text-[10.5px] text-[var(--octo-text-secondary)]"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${TABLE_DOT[table.status]}`} />
                        {table.name}
                        <span className="text-[var(--octo-text-faint)]">{table.seats}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("settings.branches.hours")}
            </h3>
            <div className="mt-2 overflow-hidden rounded-[9px] border border-[var(--octo-border-card)]">
              {DAY_ORDER.map((day) => {
                const h = branch.hours[day];
                return (
                  <div key={day} className="flex items-center justify-between gap-2 border-b border-[var(--octo-row-border)] px-3 py-2 last:border-0">
                    <span className="text-[12px] text-[var(--octo-text-secondary)]">{t(DAY_KEY[day])}</span>
                    <span className="text-[12px] font-medium text-[var(--octo-text-primary)]">
                      {h.closed ? t("settings.branches.closed") : `${h.open} – ${h.close}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {branch.ramadan && (
            <div className="mt-5 rounded-[9px] border border-[#F59E0B]/25 bg-[var(--octo-warning-bg)] px-3 py-2.5">
              <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("settings.branches.ramadan")}</p>
              <div className="mt-2 flex flex-col gap-1">
                {DAY_ORDER.map((day) => {
                  const h = branch.ramadan!.hours[day];
                  return (
                    <div key={day} className="flex items-center justify-between text-[11.5px] text-[var(--octo-text-secondary)]">
                      <span>{t(DAY_KEY[day])}</span>
                      <span>{h.closed ? t("settings.branches.closed") : `${h.open} – ${h.close}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function BranchesSettingsPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, BranchStatus>>(() =>
    Object.fromEntries(branches.map((b) => [b.id, b.status]))
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const cities = useMemo(() => Array.from(new Set(branches.map((b) => b.city))), []);
  const CITY_KEY: Record<string, string> = useMemo(
    () => ({
      Riyadh: "settings.branches.city.riyadh",
      Jeddah: "settings.branches.city.jeddah",
      Dammam: "settings.branches.city.dammam",
      "Al Khobar": "settings.branches.city.khobar",
      Makkah: "settings.branches.city.makkah",
      Madinah: "settings.branches.city.madinah",
    }),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branches.filter((b) => {
      if (cityFilter !== "all" && b.city !== cityFilter) return false;
      if (q && !b.nameEn.toLowerCase().includes(q) && !b.nameAr.includes(q)) return false;
      return true;
    });
  }, [query, cityFilter]);

  const foundBranch = branches.find((b) => b.id === drawerId) ?? null;
  const drawerBranch = foundBranch ? { ...foundBranch, status: statusById[foundBranch.id] } : null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.branches.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.branches.subtitle")}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setToast(t("settings.branches.added"))}>
          {t("settings.branches.addBranch")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {branchKpis.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.tab.branches")}</h2>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-[240px]">
            <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("settings.branches.search")}
              className="ps-8"
              aria-label={t("settings.branches.search")}
            />
          </div>
          <div className="w-full sm:w-[180px]">
            <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} aria-label={t("settings.branches.filterCity")}>
              <option value="all">{t("settings.branches.allCities")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{t(CITY_KEY[c])}</option>
              ))}
            </Select>
          </div>
          <p className="sm:ms-auto text-[11.5px] text-[var(--octo-text-faint)]">
            {t("settings.branches.showing").replace("{n}", String(filtered.length)).replace("{total}", String(branches.length))}
          </p>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)]">
                {["settings.branches.col.branch", "settings.branches.col.city", "settings.branches.col.type", "settings.branches.col.sections", "settings.branches.col.tables", "settings.branches.col.staff", "settings.branches.col.status", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {h ? t(h) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setDrawerId(row.id)}
                  className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                >
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.nameEn}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(CITY_KEY[row.city] ?? row.city)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(TYPE_KEY[row.type])}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.sections.length}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{tableCount(row)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.staff}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-end">
                    <ChevronRight size={14} className="ms-auto text-[var(--octo-text-faint)] rtl:rotate-180" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Drawer
        branch={drawerBranch}
        onClose={() => setDrawerId(null)}
        onToggleStatus={(next) => {
          if (drawerBranch) setStatusById((prev) => ({ ...prev, [drawerBranch.id]: next }));
        }}
        onNotify={setToast}
      />

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
