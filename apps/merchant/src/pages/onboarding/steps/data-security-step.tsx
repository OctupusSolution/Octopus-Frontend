// Step 7 — data residency and access preferences. Two of the five options are
// locked on: Saudi data residency and role-based access aren't switches a
// merchant can turn off, same framing as the always-included base modules.
import clsx from "clsx";
import { SECURITY_OPTIONS, type SecuritySettings } from "../_shared/extras-catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { BRAND_GRADIENT } from "@/shared/lib/brand";

export function DataSecurityStep({
  settings,
  onChange,
}: {
  settings: SecuritySettings;
  onChange: (next: SecuritySettings) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex flex-col divide-y divide-[var(--octo-divider)]">
        {SECURITY_OPTIONS.map((option) => {
          const on = option.locked ? true : settings[option.id as keyof SecuritySettings];
          return (
            <div key={option.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={clsx(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-[9px]",
                  on ? "text-white" : "bg-[var(--octo-hover)] text-[var(--octo-text-muted)]"
                )}
                style={on ? { background: BRAND_GRADIENT } : undefined}
              >
                <CatalogIcon name={option.icon} size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(option.nameKey)}</p>
                <p className="mt-0.5 text-[11px] text-[var(--octo-text-muted)]">{t(option.descKey)}</p>
              </div>

              {option.locked ? (
                <span className="shrink-0 rounded-full bg-[var(--octo-hover)] px-2.5 py-1 text-[10.5px] font-medium text-[var(--octo-text-muted)]">
                  {t("onboarding.security.alwaysOn")}
                </span>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t(option.nameKey)}
                  onClick={() =>
                    onChange({ ...settings, [option.id]: !on } as SecuritySettings)
                  }
                  className={clsx(
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                    !on && "bg-[var(--octo-switch-off)]"
                  )}
                  style={on ? { background: BRAND_GRADIENT } : undefined}
                >
                  <span
                    className={clsx(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-[var(--octo-knob)] shadow transition-all",
                      on ? "start-[18px]" : "start-0.5"
                    )}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
