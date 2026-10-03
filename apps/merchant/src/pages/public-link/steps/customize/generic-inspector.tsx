// The fallback inspector for every homepage section with no hand-written
// panel of its own: reservationsCta, events, testimonials and instagram all
// render through this file, driven entirely by `SiteSection.fields` in
// section-catalog.ts. A select field becomes a `PlSelect` inside `FieldRow`; a
// toggle field becomes a `ToggleRow`. Both dispatch `patchGeneric`.
import { useI18n } from "@/app/providers/i18n-provider";
import { SITE_SECTIONS } from "../../_shared/section-catalog";
import type { SiteAction, SiteDraft } from "../../_shared/site-draft";
import { rules, useTouched, useValidation } from "../../_shared/validation";
import { PlSelect, plText } from "../../ui/kit";
import { FieldRow, ToggleRow } from "./controls";

function Empty({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-[var(--pl-g300)] bg-[var(--pl-g50)] px-3 py-6 text-center">
      <p className={plText.h6}>{title}</p>
      <p className={plText.hint}>{note}</p>
    </div>
  );
}

export function GenericInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const { check } = useValidation();
  const { touched, touch } = useTouched();
  const id = draft.selectedSection;
  // A selection that somehow isn't in `SITE_SECTIONS` at all falls back to an
  // empty state instead of throwing.
  const section = SITE_SECTIONS.find((entry) => entry.id === id);
  if (!section) {
    return <Empty title={id} note={t("publicLink.notBuiltYet")} />;
  }

  const fields = section.fields ?? [];
  if (fields.length === 0) {
    return <Empty title={t(section.labelKey)} note={t("publicLink.notBuiltYet")} />;
  }

  const settings = draft.sectionSettings.generic[id] ?? {};

  function applyPatch(patch: Record<string, string | boolean>) {
    dispatch({ type: "patchGeneric", id, patch });
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        if (field.kind === "select") {
          const value = typeof settings[field.id] === "string" ? (settings[field.id] as string) : "";
          // Touched state is per section, so one section's blur never paints
          // another's same-named field.
          const name = `${id}.${field.id}`;
          const error = touched(name) ? check(value, [rules.required()]) : undefined;
          return (
            <FieldRow key={field.id} small label={t(field.labelKey)} error={error}>
              <PlSelect
                aria-label={t(field.labelKey)}
                invalid={Boolean(error)}
                value={value}
                onBlur={() => touch(name)}
                onChange={(e) => applyPatch({ [field.id]: e.target.value })}
              >
                <option value="" disabled>
                  {t("publicLink.select.placeholder")}
                </option>
                {field.optionKeys.map((optionKey) => (
                  <option key={optionKey} value={optionKey}>
                    {t(optionKey)}
                  </option>
                ))}
              </PlSelect>
            </FieldRow>
          );
        }

        const checked = Boolean(settings[field.id]);
        return (
          <ToggleRow
            key={field.id}
            label={t(field.labelKey)}
            checked={checked}
            onChange={() => applyPatch({ [field.id]: !checked })}
          />
        );
      })}
    </div>
  );
}
