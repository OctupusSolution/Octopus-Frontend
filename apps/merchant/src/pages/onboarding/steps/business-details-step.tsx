// Step 4 — the essentials plus the brand. Two cards: the details form, and the
// theme templates under it. The qualifying questions live at the bottom of the
// form card because the module set is still derived from them; they are the
// same questions, asked as fields rather than as a separate screen.
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import clsx from "clsx";
import { Input, Select } from "@ui/primitives";
import { QuestionsStep } from "@/widgets/business-wizard";
import { useI18n } from "@/app/providers/i18n-provider";
import {
  AUDIENCES, BRANCH_TYPES, CITIES, CURRENCIES, PALETTES, THEME_TEMPLATES, WEEKDAYS,
} from "../_shared/brand-catalog";
import { themeThumb } from "../_shared/assets";
import type { StepProps } from "../_shared/steps";

export function BusinessDetailsStep({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const { brand } = draft;

  // The branch-count field is held as raw text while it has focus. Committing
  // a clamped number on every keystroke made the field snap to 1 the instant
  // the merchant cleared it, so typing "12" fought them: clearing "1" wrote 1
  // straight back. The clamp still runs — just on blur, where an empty or
  // nonsensical value can be corrected without interrupting typing.
  const [branchCountText, setBranchCountText] = useState<string | null>(null);

  function commitBranchCount() {
    const parsed = Math.floor(Number(branchCountText));
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : brand.branchCount;
    dispatch({ type: "patchBrand", patch: { branchCount: next } });
    setBranchCountText(null);
  }

  function handleLogo(file: File | undefined) {
    if (!file) return;
    // Read to a data URL — there is no upload endpoint, and the logo only ever
    // needs to render inside this wizard. The whole draft (this data URL
    // included) gets JSON.stringify'd into sessionStorage on every change, so
    // an unbounded photo can blow the storage quota and silently break the
    // resume-after-refresh guarantee. Downscale to at most 512px on the
    // longest edge — more than any surface here actually renders — rather
    // than rejecting the file outright, since there is no i18n key to explain
    // a rejection to the merchant.
    const MAX_EDGE = 512;
    const reader = new FileReader();
    reader.onerror = () => {
      // Leave logoDataUrl unset rather than storing a broken value.
    };
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onerror = () => {
        // Failed to decode — leave logoDataUrl unset.
      };
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        dispatch({ type: "patchBrand", patch: { logoDataUrl: canvas.toDataURL("image/png") } });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("onboarding.businessName")}
            value={brand.businessName}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { businessName: e.target.value } })}
            className="!py-2.5 !text-[13px]"
          />
          <Select
            label={t("onboarding.details.city")}
            value={brand.city}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { city: e.target.value } })}
          >
            <option value="">{t("onboarding.details.cityPlaceholder")}</option>
            {CITIES.map((c) => <option key={c.id} value={c.id}>{t(c.labelKey)}</option>)}
          </Select>
          <Select
            label={t("onboarding.details.branchType")}
            value={brand.branchType}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { branchType: e.target.value } })}
          >
            <option value="">{t("onboarding.details.branchTypePlaceholder")}</option>
            {BRANCH_TYPES.map((b) => <option key={b.id} value={b.id}>{t(b.labelKey)}</option>)}
          </Select>
          <Select
            label={t("onboarding.details.currency")}
            value={brand.currency}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { currency: e.target.value } })}
          >
            {CURRENCIES.map((c) => <option key={c.id} value={c.id}>{t(c.labelKey)}</option>)}
          </Select>
          <Input
            type="number"
            min={1}
            label={t("onboarding.details.branchCount")}
            value={branchCountText ?? String(brand.branchCount)}
            onChange={(e) => setBranchCountText(e.target.value)}
            onBlur={commitBranchCount}
            className="!py-2.5 !text-[13px]"
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("onboarding.details.audience")}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {AUDIENCES.map((a) => {
                const on = brand.audiences.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => dispatch({ type: "toggleAudience", id: a.id })}
                    className={clsx(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      on
                        ? "border-[#0D6EFD] bg-[var(--octo-selected)] text-[#0D6EFD]"
                        : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                    )}
                  >
                    {t(a.labelKey)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <fieldset className="mt-5">
          <legend className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.details.hours")}
          </legend>
          <div className="mt-2 flex flex-col gap-1.5">
            {WEEKDAYS.map((day) => {
              const hours = brand.hours[day];
              return (
                <div key={day} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-2.5 py-1.5">
                  <span className="w-9 text-[11.5px] font-medium text-[var(--octo-text-secondary)]">{t(`onboarding.day.${day}`)}</span>
                  {/* Closed means closed: leaving the windows editable made
                      the switch look broken. */}
                  <input
                    type="time"
                    value={hours.from}
                    disabled={!hours.open}
                    onChange={(e) => dispatch({ type: "setDayHours", day, hours: { ...hours, from: e.target.value } })}
                    className="rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[11.5px] text-[var(--octo-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <span className={clsx("text-[var(--octo-text-faint)]", !hours.open && "opacity-45")}>—</span>
                  <input
                    type="time"
                    value={hours.to}
                    disabled={!hours.open}
                    onChange={(e) => dispatch({ type: "setDayHours", day, hours: { ...hours, to: e.target.value } })}
                    className="rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[11.5px] text-[var(--octo-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hours.open}
                    aria-label={t(`onboarding.day.${day}`)}
                    onClick={() => dispatch({ type: "setDayHours", day, hours: { ...hours, open: !hours.open } })}
                    className={clsx(
                      "relative ms-auto h-5 w-9 shrink-0 rounded-full transition-colors",
                      hours.open ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
                    )}
                  >
                    <span className={clsx(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-[var(--octo-knob)] shadow transition-all",
                      hours.open ? "start-[18px]" : "start-0.5"
                    )} />
                  </button>
                </div>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.details.logo")}
          </legend>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleLogo(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[var(--octo-border-input)] px-3 py-6 text-[11.5px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {brand.logoDataUrl ? (
              <img src={brand.logoDataUrl} alt="" className="max-h-24 object-contain" />
            ) : (
              <Upload size={16} />
            )}
            {t(brand.logoDataUrl ? "onboarding.details.changeLogo" : "onboarding.details.uploadLogo")}
          </button>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.details.palette")}
          </legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                aria-pressed={brand.primary === palette.primary}
                aria-label={`${t("onboarding.details.palette")} ${palette.primary}`}
                // The solid swatch is the primary colour, and that is all it
                // sets — the suggested combinations below are what set a
                // primary/secondary pair. Two rows with identical handlers made
                // the second one a decoy.
                onClick={() => dispatch({ type: "patchBrand", patch: { primary: palette.primary } })}
                className={clsx(
                  "h-12 w-24 rounded-[10px] border-2 transition-all",
                  brand.primary === palette.primary ? "border-[#0D6EFD]" : "border-transparent"
                )}
                style={{ backgroundColor: palette.primary }}
              />
            ))}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2 text-[11.5px] font-medium text-[#0D6EFD]">
              {t("onboarding.details.addCustomColor")}
              <input
                type="color"
                value={brand.primary}
                onChange={(e) => dispatch({ type: "patchBrand", patch: { primary: e.target.value } })}
                className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
          </div>

          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.details.suggested")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                aria-pressed={brand.primary === palette.primary && brand.secondary === palette.secondary}
                aria-label={`${t("onboarding.details.suggested")} ${palette.primary}`}
                // A suggested combination: primary and secondary together.
                onClick={() => dispatch({ type: "patchBrand", patch: { primary: palette.primary, secondary: palette.secondary } })}
                className={clsx(
                  "flex overflow-hidden rounded-[8px] border-2",
                  brand.primary === palette.primary && brand.secondary === palette.secondary
                    ? "border-[#0D6EFD]"
                    : "border-[var(--octo-border-card)]"
                )}
              >
                {palette.tints.map((tint) => (
                  <span key={tint} className="h-8 w-8" style={{ backgroundColor: tint }} />
                ))}
              </button>
            ))}
          </div>
        </fieldset>

        {draft.type && (
          <div className="mt-6 border-t border-[var(--octo-divider)] pt-5">
            <QuestionsStep
              type={draft.type}
              answers={draft.answers}
              onAnswer={(questionId, optionId) => dispatch({ type: "answer", questionId, optionId })}
              exclude={["branches"]}
            />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
        <h3 className="text-[18px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.details.brandTheme")}</h3>
        <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{t("onboarding.details.subtitle")}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_TEMPLATES.map((template) => {
            const thumb = themeThumb(template.id);
            const active = brand.themeTemplate === template.id;
            return (
              <article
                key={template.id}
                className={clsx(
                  "flex flex-col overflow-hidden rounded-xl border transition-all",
                  active ? "border-[#0D6EFD] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]" : "border-[var(--octo-border-card)]"
                )}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="h-28 w-full object-cover" />
                ) : (
                  // No photo for this template yet — a gradient from the
                  // merchant's own palette, rather than someone else's stock image.
                  <div
                    className="h-28 w-full"
                    style={{ background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)` }}
                  />
                )}
                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <p className="text-[13.5px] font-bold text-[var(--octo-text-primary)]">{t(template.nameKey)}</p>
                  <p className="text-[11px] leading-relaxed text-[var(--octo-text-muted)]">{t(template.descKey)}</p>
                  <p className="text-[10.5px] text-[var(--octo-text-faint)]">{t("onboarding.details.bestFor")}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.bestForKeys.map((key) => (
                      <span key={key} className="rounded-full bg-[var(--octo-selected)] px-2 py-0.5 text-[10px] text-[#0D6EFD]">
                        {t(key)}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "patchBrand", patch: { themeTemplate: template.id } })}
                    className={clsx(
                      "mt-auto rounded-[9px] border px-3 py-2 text-[11.5px] font-semibold transition-colors",
                      active
                        ? "border-[#0D6EFD] bg-[#0D6EFD] text-white"
                        : "border-[#0D6EFD] text-[#0D6EFD] hover:bg-[var(--octo-selected)]"
                    )}
                  >
                    {t("onboarding.details.useTemplate")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
