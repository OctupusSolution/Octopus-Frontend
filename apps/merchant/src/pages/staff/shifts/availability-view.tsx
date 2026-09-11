import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import clsx from "clsx";
import { EmptyState } from "@ui/primitives";
import { branches, TODAY, type Branch } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "../_shared/buttons";
import { SelectInput, TextInput } from "../_shared/form";
import { addDays, formatWeekday, fromISO, startOfWeek } from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { useStaffStore } from "../_shared/staff-store";

export function AvailabilityView() {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<"all" | Branch>("all");

  const weekdays = useMemo(() => {
    const monday = startOfWeek(fromISO(TODAY));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  const staff = store.employees.filter(
    (e) =>
      e.role !== "Owner" &&
      !store.isInactive(e.id) &&
      (branchFilter === "all" || e.branch === branchFilter) &&
      (!query.trim() || e.name.toLowerCase().includes(query.trim().toLowerCase()))
  );

  const toggle = (employeeId: string, day: number) =>
    store.setAvailability((prev) => {
      const current = prev[employeeId] ?? Array(7).fill(true);
      const next = [...current];
      next[day] = !next[day];
      return { ...prev, [employeeId]: next };
    });

  const setAll = (employeeId: string, value: boolean) =>
    store.setAvailability((prev) => ({ ...prev, [employeeId]: Array(7).fill(value) }));

  return (
    <div>
      <p className="text-[14px] text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.availability.subtitle")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <TextInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("staff.grid.searchPlaceholder")}
            aria-label={t("staff.grid.searchPlaceholder")}
            leading={<Search size={20} />}
          />
        </div>
        <div className="w-full sm:w-[190px]">
          <SelectInput aria-label={t("staff.filter.allBranches")} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as "all" | Branch)}>
            <option value="all">{t("staff.filter.allBranches")}</option>
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </SelectInput>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-[var(--octo-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-[4px] bg-[var(--octo-tone-success-bg)] ring-1 ring-[#16A34A]/40" />
            {t("staff.shiftsTab.availability.available")}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-[4px] border border-dashed border-[var(--octo-border-input)]" />
            {t("staff.shiftsTab.availability.unavailable")}
          </span>
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="mt-4 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <EmptyState icon={<Users size={18} />} title={t("staff.grid.emptyTitle")} description={t("staff.grid.emptyFiltered")} />
        </div>
      ) : (
        <div className="octo-scroll mt-4 overflow-x-auto rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <table className="w-full min-w-[980px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[220px]" />
              {weekdays.map((d) => (
                <col key={d.getDay()} />
              ))}
              <col className="w-[130px]" />
            </colgroup>
            <thead>
              <tr className="bg-[var(--octo-hover)]">
                <th scope="col" className="px-4 py-3 text-start text-[13px] font-medium text-[var(--octo-text-primary)]">{t("staff.shiftsTab.allEmployees")}</th>
                {weekdays.map((d) => (
                  <th key={d.getDay()} scope="col" className="px-2 py-3 text-center text-[13px] font-medium text-[var(--octo-text-primary)]">
                    {formatWeekday(d, locale)}
                  </th>
                ))}
                <th scope="col" className="px-3 py-3 text-center text-[13px] font-medium text-[var(--octo-text-primary)]">{t("staff.shiftsTab.availability.days")}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((e) => {
                const week = store.availability[e.id] ?? Array(7).fill(true);
                const availableDays = week.filter(Boolean).length;
                return (
                  <tr key={e.id} className="border-t border-[var(--octo-divider)]">
                    <th scope="row" className="px-4 py-2.5 text-start font-normal">
                      <span className="block truncate text-[14px] font-medium text-[var(--octo-text-primary)]">{e.name}</span>
                      <span className="block truncate text-[12px] text-[var(--octo-text-secondary)]">
                        {labels.data("staff.jobTitle", store.profileOf(e.id)?.jobTitle ?? "")}
                      </span>
                    </th>
                    {weekdays.map((d, i) => {
                      const available = week[i];
                      return (
                        <td key={d.getDay()} className="px-1.5 py-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={available}
                            aria-label={`${e.name} — ${formatWeekday(d, locale)}`}
                            onClick={() => toggle(e.id, i)}
                            className={clsx(
                              "h-9 w-full truncate rounded-[8px] border px-1 text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                              available
                                ? "border-[#16A34A]/35 bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)] hover:brightness-95"
                                : "border-dashed border-[var(--octo-border-input)] text-[var(--octo-text-faint)] hover:border-[var(--octo-text-muted)]"
                            )}
                          >
                            {t(available ? "staff.shiftsTab.availability.available" : "staff.shiftsTab.availability.unavailable")}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className="block text-[13px] font-medium text-[var(--octo-text-primary)]">{availableDays}/7</span>
                      <button
                        type="button"
                        onClick={() => setAll(e.id, availableDays < 7)}
                        className={buttonClass("ghost", "sm", "h-7 px-2 text-[12px] text-[#0D6EFD]")}
                      >
                        {t(availableDays < 7 ? "staff.shiftsTab.availability.markAll" : "staff.shiftsTab.availability.clearAll")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
