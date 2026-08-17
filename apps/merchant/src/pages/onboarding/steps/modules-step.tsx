// Step 5 — what we recommend, why, and what it costs.
//
// Three groups, deliberately: what is always included (no decision to make),
// what we switched on for this merchant (with the reason we did it), and what
// they could add. Modules the type marks `na` never appear at all — offering a
// cloud kitchen a table-reservations upsell would be noise, not revenue.
import { Info, Lock } from "lucide-react";
import clsx from "clsx";
import {
  addOnModules, availabilityFor, baseModuleIds, dependentsOf, formatSar,
  getModule, questionsFor, type ModuleId, type TypeCode,
} from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { BRAND_GRADIENT } from "@/shared/lib/brand";
import type { Answers } from "./questions-step";

/** Why a module ended up switched on, in the merchant's own terms. */
function reasonFor(
  moduleId: ModuleId,
  type: TypeCode,
  answers: Answers,
  t: (key: string) => string
): string {
  const availability = availabilityFor(type, moduleId);
  if (availability === "core") return t("onboarding.reason.core");

  // Prefer quoting the merchant's own answer back at them when one caused it.
  for (const question of questionsFor(type)) {
    const answerId = answers[question.id];
    if (!answerId) continue;
    const option = question.options.find((o) => o.id === answerId);
    if (option?.enables.includes(moduleId)) {
      return t("onboarding.reason.answer").replace("{answer}", t(option.labelKey));
    }
  }

  if (availability === "recommended") return t("onboarding.reason.recommended");
  return t("onboarding.reason.added");
}

export function ModulesStep({
  type,
  answers,
  enabled,
  onToggle,
}: {
  type: TypeCode;
  answers: Answers;
  enabled: readonly ModuleId[];
  onToggle: (id: ModuleId, next: boolean) => void;
}) {
  const { t, locale } = useI18n();

  // `na` modules are dropped entirely — they are not part of this product for
  // this business type, so they are not shown even as a locked upsell.
  const applicable = addOnModules.filter((m) => availabilityFor(type, m.id) !== "na");
  const selected = applicable.filter((m) => enabled.includes(m.id));
  const available = applicable.filter((m) => !enabled.includes(m.id));

  return (
    <div className="flex flex-col gap-3">
      {/* Always included */}
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h3 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
          <Lock size={11} /> {t("onboarding.baseSection")}
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {baseModuleIds.map((id) => {
            const module = getModule(id);
            if (!module) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--octo-hover)] px-2.5 py-1 text-[11.5px] text-[var(--octo-text-secondary)]"
              >
                <CatalogIcon name={module.icon} size={12} />
                {t(module.nameKey)}
              </span>
            );
          })}
        </div>
      </section>

      {selected.length > 0 && (
        <ModuleGroup
          titleKey="onboarding.recommendedSection"
          modules={selected}
          enabled
          type={type}
          answers={answers}
          onToggle={onToggle}
          t={t}
          locale={locale}
        />
      )}

      {available.length > 0 && (
        <ModuleGroup
          titleKey="onboarding.optionalSection"
          modules={available}
          enabled={false}
          type={type}
          answers={answers}
          onToggle={onToggle}
          t={t}
          locale={locale}
        />
      )}
    </div>
  );
}

function ModuleGroup({
  titleKey, modules, enabled, type, answers, onToggle, t, locale,
}: {
  titleKey: string;
  modules: ReturnType<typeof addOnModules.filter>;
  enabled: boolean;
  type: TypeCode;
  answers: Answers;
  onToggle: (id: ModuleId, next: boolean) => void;
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
        {t(titleKey)}
      </h3>

      <div className="mt-3 flex flex-col gap-2">
        {modules.map((module) => {
          const dependents = enabled
            ? dependentsOf(module.id).filter((d) => modules.some((m) => m.id === d.id))
            : [];
          const requires = module.dependencies
            ?.map((d) => getModule(d))
            .filter((d): d is NonNullable<typeof d> => Boolean(d) && !baseModuleIds.includes(d!.id));

          return (
            <div
              key={module.id}
              className={clsx(
                "flex flex-wrap items-center gap-3 rounded-[10px] border px-3 py-2.5",
                enabled ? "border-[#0D6EFD]/30 bg-[var(--octo-selected)]" : "border-[var(--octo-border-input)]"
              )}
            >
              <span
                className={clsx(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-[8px]",
                  enabled ? "text-white" : "bg-[var(--octo-hover)] text-[var(--octo-text-muted)]"
                )}
                style={enabled ? { background: BRAND_GRADIENT } : undefined}
              >
                <CatalogIcon name={module.icon} size={15} />
              </span>

              <div className="min-w-[160px] flex-1">
                <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(module.nameKey)}</p>
                <p className="mt-0.5 text-[11px] text-[var(--octo-text-muted)]">{t(module.descKey)}</p>
                {enabled && (
                  <p className="mt-1 flex items-center gap-1 text-[10.5px] text-[#0D6EFD]">
                    <Info size={10} />
                    {reasonFor(module.id, type, answers, t)}
                  </p>
                )}
                {!enabled && requires && requires.length > 0 && (
                  <p className="mt-1 text-[10.5px] text-[var(--octo-text-faint)]">
                    {t("onboarding.requiresNote").replace("{name}", t(requires[0].nameKey))}
                  </p>
                )}
              </div>

              <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                {module.price === null
                  ? t("pricing.onRequest")
                  : `${formatSar(module.price, locale)} ${t("pricing.perMonth")}`}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={t(module.nameKey)}
                onClick={() => onToggle(module.id, !enabled)}
                title={
                  dependents.length > 0
                    ? t("onboarding.requiresNote").replace("{name}", t(dependents[0].nameKey))
                    : undefined
                }
                className={clsx(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  !enabled && "bg-[var(--octo-switch-off)]"
                )}
                style={enabled ? { background: BRAND_GRADIENT } : undefined}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-[var(--octo-knob)] shadow transition-all",
                    enabled ? "start-[18px]" : "start-0.5"
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
