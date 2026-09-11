import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { MODULES, type ModuleId } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { useStaffLabels } from "./_shared/labels";
import { useDismiss } from "./_shared/use-dismiss";

const VISIBLE = 4;

export function ModulesSelect({ id, value, onChange }: { id: string; value: readonly ModuleId[]; onChange: (next: ModuleId[]) => void }) {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  const selected = MODULES.filter((m) => value.includes(m.id));
  const extra = selected.length - VISIBLE;
  const allSelected = selected.length === MODULES.length;

  const toggle = (moduleId: ModuleId) => {
    const next = value.includes(moduleId) ? value.filter((v) => v !== moduleId) : [...value, moduleId];
    onChange(MODULES.map((m) => m.id).filter((mid) => next.includes(mid)));
  };

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-start text-[14px] text-[var(--octo-text-primary)] transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/20"
      >
        <span className="min-w-0 flex-1 truncate">
          {selected.length === 0 ? (
            <span className="text-[var(--octo-text-faint)]">{t("staff.member.modules.none")}</span>
          ) : (
            <>
              {selected.slice(0, VISIBLE).map((m) => labels.moduleLabel(m.id)).join(", ")}
              {extra > 0 && <span className="text-[#0D6EFD]">, +{extra}</span>}
            </>
          )}
        </span>
        <ChevronDown size={18} aria-hidden className={clsx("shrink-0 text-[var(--octo-text-secondary)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 shadow-[0_12px_32px_rgba(16,24,40,0.14)]">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] font-semibold text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#0D6EFD]"
              checked={allSelected}
              onChange={() => onChange(allSelected ? [] : MODULES.map((m) => m.id))}
            />
            {t("staff.member.modules.selectAll")}
          </label>
          <div className="my-1 border-t border-[var(--octo-divider)]" />
          <div className="octo-scroll grid max-h-64 grid-cols-1 overflow-y-auto sm:grid-cols-2">
            {MODULES.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
              >
                <input type="checkbox" className="h-4 w-4 accent-[#0D6EFD]" checked={value.includes(m.id)} onChange={() => toggle(m.id)} />
                {labels.moduleLabel(m.id)}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
