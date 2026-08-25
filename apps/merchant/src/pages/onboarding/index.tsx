// The signup flow. An ordered set of steps that turns "what kind of business
// are you?" into a provisioned dashboard, a module set and a monthly price.
//
// This component owns no answers. The draft lives in a reducer, the order
// lives in the STEPS registry, and each step is handed { draft, dispatch }.
// Rendered outside the app shell — no sidebar, no top bar — because the
// sidebar it would show does not exist yet at this point.
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Languages, Moon, Sun } from "lucide-react";
import { Button } from "@ui/primitives";
import { defaultModulesFor, questionsFor, withDependencies } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { useTheme } from "@/app/providers/theme-provider";
import { PriceBar } from "./_shared/price-bar";
import { StepRail } from "./_shared/step-rail";
import { StepShell } from "./_shared/step-shell";
import { STEPS } from "./_shared/steps";
import { useOnboardingDraft } from "./_shared/use-onboarding-draft";
import { LOGO_URL } from "./_shared/assets";

export function OnboardingPage() {
  const { t, dir, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { createBusiness } = useTenantConfig();
  const { draft, dispatch, clear, restored } = useOnboardingDraft();

  const index = Math.min(Math.max(1, draft.step), STEPS.length) - 1;
  const current = STEPS[index];
  const labelKeys = useMemo(() => STEPS.map((s) => s.labelKey), []);

  // The module set is derived from the type profile plus whatever the answers
  // switched on, and re-derived whenever the type or an answer changes. A
  // restored draft already carries the merchant's own hand-picked `enabled`
  // list, so deriving on the mount that restored it would clobber those picks
  // with the type's defaults. `restoredSnapshot` freezes the exact
  // `{ type, answers }` the draft was restored with, once, without ever being
  // mutated by the effect itself — comparing against a frozen value (rather
  // than consuming a "first run" flag inside the effect body) is what keeps
  // this correct under React 18 StrictMode, which deliberately re-invokes a
  // fresh mount's effects twice; a flag flipped inside the effect gets
  // consumed by the first of those two invocations and derives (and
  // overwrites the restored picks) on the second. Once a real `setType` or
  // `answer` dispatch changes `draft.type`/`draft.answers` away from the
  // snapshot, the comparison stops matching for the rest of the session and
  // every subsequent change derives normally.
  const restoredSnapshot = useRef(restored ? { type: draft.type, answers: draft.answers } : null);
  useEffect(() => {
    const snapshot = restoredSnapshot.current;
    if (snapshot && draft.type === snapshot.type && draft.answers === snapshot.answers) return;
    if (!draft.type) return;
    const fromAnswers = questionsFor(draft.type).flatMap((question) => {
      const option = question.options.find((o) => o.id === draft.answers[question.id]);
      return option ? [...option.enables] : [];
    });
    dispatch({ type: "setModules", ids: withDependencies([...defaultModulesFor(draft.type), ...fromAnswers]) });

    // Branch count rides along with the same trigger: derived from the
    // `branches` qualifying answer when the merchant has actually answered
    // it, left untouched otherwise (a later task adds an explicit numeric
    // field and must not have a default silently overwrite it).
    const branchesQuestion = questionsFor(draft.type).find((q) => q.id === "branches");
    const branchesOption = branchesQuestion?.options.find((o) => o.id === draft.answers[branchesQuestion.id]);
    if (branchesOption?.branchCount !== undefined) {
      dispatch({ type: "patchBrand", patch: { branchCount: branchesOption.branchCount } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type, draft.answers]);

  function handleFinish() {
    if (!draft.vertical || !draft.type) return;
    createBusiness({
      vertical: draft.vertical,
      businessType: draft.type,
      enabledModules: draft.enabled,
      branchCount: draft.brand.branchCount,
      businessName: draft.brand.businessName.trim() || "My Business",
    });
    signIn(draft.account.email.trim() || "owner@octopus.sa", draft.account.password.trim() !== "");
    clear();
    navigate("/", { replace: true });
  }

  const canContinue = current.canContinue(draft);
  const isLast = index === STEPS.length - 1;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextArrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const actions = (
    <>
      {index > 0 && (
        <Button variant="secondary" onClick={() => dispatch({ type: "back" })} icon={<BackArrow size={14} />}>
          {t("onboarding.back")}
        </Button>
      )}
      {isLast ? (
        <Button variant="primary" disabled={!canContinue} onClick={handleFinish}>
          {t("onboarding.create")}
        </Button>
      ) : (
        <Button variant="primary" disabled={!canContinue} onClick={() => dispatch({ type: "next" })}>
          {t("onboarding.next")}
          <NextArrow size={14} />
        </Button>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--octo-page-bg)]">
      <header className="border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[1fr_auto_1fr] items-center px-5 py-4">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-1.5 justify-self-start text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]"
          >
            <BackArrow size={14} />
            <span className="hidden sm:inline">{t("onboarding.backToSignIn")}</span>
          </button>
          <div className="flex items-center gap-2 justify-self-center">
            <img src={LOGO_URL} alt="OCTOPUS" width={30} height={30} className="rounded-lg object-contain" />
            <span className="text-[15px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
          </div>
          <div className="flex items-center justify-self-end gap-2">
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              aria-label={t("topbar.language")}
              className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <Languages size={15} />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("topbar.theme")}
              className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8">
        <StepRail step={index + 1} labelKeys={labelKeys} />

        <span className="mt-8 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#0D6EFD]">
          {t("onboarding.step").replace("{n}", String(index + 1)).replace("{total}", String(STEPS.length))}
        </span>
        <h1 className="mt-1.5 text-[24px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)] sm:text-[28px]">
          {t(current.titleKey)}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--octo-text-muted)]">{t(current.subtitleKey)}</p>

        <div className="mt-6">
          <StepShell aside={current.Aside ? <current.Aside draft={draft} dispatch={dispatch} /> : undefined}>
            <current.Component draft={draft} dispatch={dispatch} />
          </StepShell>
        </div>
      </main>

      {current.showPriceBar ? (
        <PriceBar modules={draft.enabled} branchCount={draft.brand.branchCount} action={actions} />
      ) : (
        <div className="sticky bottom-0 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1180px] items-center justify-end gap-2 px-5 py-3.5">{actions}</div>
        </div>
      )}
    </div>
  );
}
