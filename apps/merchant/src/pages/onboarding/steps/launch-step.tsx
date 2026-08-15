// Step 10 — a small readiness checklist above the same account form that has
// always closed this wizard. Nothing about account creation changes here:
// this is a thin wrapper, not a new subsystem.
import { CheckCircle2, Circle } from "lucide-react";
import { baseModuleIds, type ModuleId, type TypeCode, type VerticalId } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { BRAND_GRADIENT } from "../_shared/brand";
import { AccountStep, type AccountDetails } from "./account-step";

export function LaunchStep({
  type,
  vertical,
  enabled,
  details,
  onChange,
}: {
  type: TypeCode;
  vertical: VerticalId | null;
  enabled: readonly ModuleId[];
  details: AccountDetails;
  onChange: (next: AccountDetails) => void;
}) {
  const { t } = useI18n();

  const checks = [
    { done: vertical !== null, labelKey: "onboarding.launch.checklist.vertical" },
    { done: true, labelKey: "onboarding.launch.checklist.type" }, // type is required to reach this step
    { done: enabled.length > baseModuleIds.length, labelKey: "onboarding.launch.checklist.modules" },
    { done: details.businessName.trim() !== "" && details.email.trim() !== "", labelKey: "onboarding.launch.checklist.account" },
  ];
  const percent = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);

  return (
    <div className="mx-auto flex max-w-[440px] flex-col gap-4">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.launch.readiness")}
          </p>
          <p className="text-[15px] font-bold text-[var(--octo-text-primary)]">{percent}%</p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--octo-track)]">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%`, background: BRAND_GRADIENT }}
          />
        </div>

        <ul className="mt-3 flex flex-col gap-1.5">
          {checks.map((c) => (
            <li key={c.labelKey} className="flex items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]">
              {c.done ? (
                <CheckCircle2 size={14} className="shrink-0 text-[#22C55E]" />
              ) : (
                <Circle size={14} className="shrink-0 text-[var(--octo-text-faint)]" />
              )}
              {t(c.labelKey)}
            </li>
          ))}
        </ul>
      </section>

      <AccountStep type={type} details={details} onChange={onChange} />
    </div>
  );
}
