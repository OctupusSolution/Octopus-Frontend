// The signup flow. Ten steps that turn "what kind of business are you?" into
// a provisioned dashboard, a module set and a monthly price — plus goals,
// integrations, security preferences, team invites and workflow templates
// collected along the way for context. Only vertical, type, the qualifying
// questions, module selection and the final account details are real/billed;
// everything else is honest mock state shown back on the Review step.
//
// Rendered outside the app shell — no sidebar, no top bar — because the
// sidebar it would show does not exist yet at this point.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Languages, Moon, Sun } from "lucide-react";
import { Button } from "@ui/primitives";
import {
  baseModuleIds, defaultModulesFor, questionsFor,
  withDependencies, withoutDependents,
  type ModuleId, type TypeCode, type VerticalId,
} from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { useTheme } from "@/app/providers/theme-provider";
import { PriceBar } from "./_shared/price-bar";
import { StepRail } from "./_shared/step-rail";
import { LOGO_URL } from "./_shared/assets";
import {
  DEFAULT_SECURITY,
  type GoalId, type IntegrationId, type SecuritySettings, type TeamInvite, type WorkflowId,
} from "./_shared/extras-catalog";
import { VerticalStep, TypeStep, QuestionsStep, ModulesStep, type Answers } from "@/widgets/business-wizard";
import { GoalsStep } from "./steps/goals-step";
import { IntegrationsStep } from "./steps/integrations-step";
import { DataSecurityStep } from "./steps/data-security-step";
import { TeamWorkflowsStep } from "./steps/team-workflows-step";
import { SummaryStep } from "./steps/summary-step";
import { LaunchStep } from "./steps/launch-step";
import type { AccountDetails } from "./steps/account-step";

const TOTAL_STEPS = 10;

/** Add/remove `id` from a small local-state array — the same toggle shape used by goals, integrations and workflows. */
function toggled<T>(list: readonly T[], id: T): T[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

// Whole-wizard draft, kept in sessionStorage so a mid-flow refresh (or an
// accidental tab reload) resumes exactly where the merchant left off instead
// of bouncing back to step 1. Session-scoped, not permanent — an abandoned
// signup shouldn't haunt the browser forever, so it clears with the tab and
// is dropped once the business is actually created.
const DRAFT_KEY = "octopus.onboarding.draft";

interface OnboardingDraft {
  step: number;
  vertical: VerticalId | null;
  type: TypeCode | null;
  answers: Answers;
  enabled: ModuleId[];
  details: AccountDetails;
  goals: GoalId[];
  integrations: IntegrationId[];
  security: SecuritySettings;
  team: TeamInvite[];
  workflows: WorkflowId[];
}

function readDraft(): Partial<OnboardingDraft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<OnboardingDraft>) : {};
  } catch {
    return {};
  }
}

export function OnboardingPage() {
  const { t, dir, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { createBusiness } = useTenantConfig();

  const draft = useMemo(readDraft, []);

  const [step, setStep] = useState(draft.step ?? 1);
  const [vertical, setVertical] = useState<VerticalId | null>(draft.vertical ?? null);
  const [type, setType] = useState<TypeCode | null>(draft.type ?? null);
  const [answers, setAnswers] = useState<Answers>(draft.answers ?? {});
  const [enabled, setEnabled] = useState<ModuleId[]>(draft.enabled ?? [...baseModuleIds]);
  const [details, setDetails] = useState<AccountDetails>(draft.details ?? { businessName: "", email: "", phone: "", password: "" });

  // Presentational-only — never read by handleCreate, never sent to saveConfig.
  const [goals, setGoals] = useState<GoalId[]>(draft.goals ?? []);
  const [integrations, setIntegrations] = useState<IntegrationId[]>(draft.integrations ?? []);
  const [security, setSecurity] = useState<SecuritySettings>(draft.security ?? DEFAULT_SECURITY);
  const [team, setTeam] = useState<TeamInvite[]>(draft.team ?? []);
  const [workflows, setWorkflows] = useState<WorkflowId[]>(draft.workflows ?? []);

  // Persist the whole draft on every change so a refresh mid-flow resumes here.
  useEffect(() => {
    const data: OnboardingDraft = {
      step, vertical, type, answers, enabled, details, goals, integrations, security, team, workflows,
    };
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [step, vertical, type, answers, enabled, details, goals, integrations, security, team, workflows]);

  // Branch count is just another answer; the price bar needs it separately.
  const branchCount = useMemo(() => {
    if (!type) return 1;
    const question = questionsFor(type).find((q) => q.id === "branches");
    const option = question?.options.find((o) => o.id === answers.branches);
    return option?.branchCount ?? 1;
  }, [type, answers.branches]);

  // The module set is derived from the type profile plus whatever the answers
  // switched on. Re-derived only when the type or an answer changes, so the
  // manual toggles on the Modules step are never clobbered.
  useEffect(() => {
    if (!type) return;
    const fromType = defaultModulesFor(type);
    const fromAnswers: ModuleId[] = [];
    for (const question of questionsFor(type)) {
      const option = question.options.find((o) => o.id === answers[question.id]);
      if (option) fromAnswers.push(...option.enables);
    }
    setEnabled(withDependencies([...fromType, ...fromAnswers]));
  }, [type, answers]);

  function handleSelectType(code: TypeCode) {
    setType(code);
    // Reset answers: a question relevant to the old type may not exist for
    // the new one, and a stale answer would silently keep a module switched on.
    setAnswers({});
  }

  function handleAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function handleToggleModule(id: ModuleId, next: boolean) {
    setEnabled((prev) =>
      next ? withDependencies([...prev, id]) : withoutDependents(prev, id)
    );
  }

  function handleCreate() {
    if (!vertical || !type) return;
    createBusiness({
      vertical,
      businessType: type,
      enabledModules: enabled,
      branchCount,
      businessName: details.businessName.trim() || "My Business",
    });
    signIn(details.email.trim() || "owner@octopus.sa", details.password.trim() !== "");
    window.sessionStorage.removeItem(DRAFT_KEY);
    navigate("/", { replace: true });
  }

  const canContinue =
    step === 1 ? vertical !== null :
    step === 2 ? type !== null :
    step === 10 ? details.businessName.trim() !== "" && details.email.trim() !== "" :
    true;

  const titleKey = `onboarding.step${step}.title`;
  const subtitleKey = `onboarding.step${step}.subtitle`;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextArrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--octo-page-bg)]">
      <header className="border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]">
        <div className="mx-auto grid max-w-[900px] grid-cols-[1fr_auto_1fr] items-center px-5 py-4">
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

      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-8">
        <StepRail step={step} total={TOTAL_STEPS} />

        <span className="mt-8 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#0D6EFD]">
          {t("onboarding.step").replace("{n}", String(step)).replace("{total}", String(TOTAL_STEPS))}
        </span>
        <h1 className="mt-1.5 text-[24px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)] sm:text-[28px]">
          {t(titleKey)}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--octo-text-muted)]">{t(subtitleKey)}</p>

        <div className="mt-6">
          {step === 1 && <VerticalStep selected={vertical} onSelect={setVertical} />}
          {step === 2 && <TypeStep selected={type} onSelect={handleSelectType} />}
          {step === 3 && (
            <GoalsStep selected={goals} onToggle={(id) => setGoals((prev) => toggled(prev, id))} />
          )}
          {step === 4 && type && (
            <QuestionsStep type={type} answers={answers} onAnswer={handleAnswer} />
          )}
          {step === 5 && type && (
            <ModulesStep type={type} answers={answers} enabled={enabled} onToggle={handleToggleModule} />
          )}
          {step === 6 && (
            <IntegrationsStep
              selected={integrations}
              onToggle={(id) => setIntegrations((prev) => toggled(prev, id))}
            />
          )}
          {step === 7 && <DataSecurityStep settings={security} onChange={setSecurity} />}
          {step === 8 && (
            <TeamWorkflowsStep
              team={team}
              onTeamChange={setTeam}
              workflows={workflows}
              onToggleWorkflow={(id) => setWorkflows((prev) => toggled(prev, id))}
              enabledModules={enabled}
            />
          )}
          {step === 9 && (
            <SummaryStep
              vertical={vertical}
              type={type}
              goals={goals}
              enabled={enabled}
              branchCount={branchCount}
              integrations={integrations}
              security={security}
              team={team}
              workflows={workflows}
              onEditStep={setStep}
            />
          )}
          {step === 10 && type && (
            <LaunchStep type={type} vertical={vertical} enabled={enabled} details={details} onChange={setDetails} />
          )}
        </div>
      </main>

      {/* The price only becomes meaningful once the qualifying questions start
          shaping the module set, so the bar appears from step 4 onward — before
          that there is nothing to total up. */}
      {step >= 4 ? (
        <PriceBar
          modules={enabled}
          branchCount={branchCount}
          action={
            <>
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)} icon={<BackArrow size={14} />}>
                {t("onboarding.back")}
              </Button>
              {step < TOTAL_STEPS ? (
                <Button variant="primary" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                  {step === 8 && team.length === 0 ? t("onboarding.team.continueWithoutAdding") : t("onboarding.next")}
                  <NextArrow size={14} />
                </Button>
              ) : (
                <Button variant="primary" disabled={!canContinue} onClick={handleCreate}>
                  {t("onboarding.create")}
                </Button>
              )}
            </>
          }
        />
      ) : (
        <div className="sticky bottom-0 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[900px] items-center justify-end gap-2 px-5 py-3.5">
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)} icon={<BackArrow size={14} />}>
                {t("onboarding.back")}
              </Button>
            )}
            <Button variant="primary" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
              {t("onboarding.next")}
              <NextArrow size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
