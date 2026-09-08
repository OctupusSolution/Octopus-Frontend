// The fallback inspector for every homepage section with no hand-written
// panel of its own: reservationsCta, events, testimonials and instagram all
// render through this file, driven entirely by `SiteSection.fields` in
// section-catalog.ts. A select field becomes a `Select` inside `FieldRow`; a
// toggle field becomes a `ToggleRow`. Both dispatch `patchGeneric`.
import { EmptyState, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { SITE_SECTIONS } from "../../_shared/section-catalog";
import type { SiteAction, SiteDraft } from "../../_shared/site-draft";
import { FieldRow, ToggleRow } from "./controls";

export function GenericInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const id = draft.selectedSection;
  // The non-null assertion the brief calls for applies only to a section this
  // builder's own catalog guarantees exists; a selection that somehow isn't
  // in `SITE_SECTIONS` at all falls back to this `EmptyState` instead of
  // throwing.
  const section = SITE_SECTIONS.find((entry) => entry.id === id);
  if (!section) {
    return <EmptyState title={id} description={t("publicLink.notBuiltYet")} />;
  }

  const fields = section.fields ?? [];
  if (fields.length === 0) {
    return <EmptyState title={t(section.labelKey)} description={t("publicLink.notBuiltYet")} />;
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
          return (
            <FieldRow key={field.id} label={t(field.labelKey)}>
              <Select value={value} onChange={(e) => applyPatch({ [field.id]: e.target.value })}>
                <option value="" />
                {field.optionKeys.map((optionKey) => (
                  <option key={optionKey} value={optionKey}>
                    {t(optionKey)}
                  </option>
                ))}
              </Select>
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
