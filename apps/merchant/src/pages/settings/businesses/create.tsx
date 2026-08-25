// Full-page "create a new business" wizard. Used to be a modal squeezed into
// a dialog — five steps (name, industry, type, qualifying questions, modules)
// need more room than that, so it's now its own route instead.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { Button, Input } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import {
  baseModuleIds, defaultModulesFor, questionsFor,
  withDependencies, withoutDependents,
  type ModuleId, type TypeCode, type VerticalId,
} from "@/shared/catalog";
import { VerticalStep, TypeStep, QuestionsStep, ModulesStep, type Answers } from "@/widgets/business-wizard";
import { StepRail } from "@/pages/onboarding/_shared/step-rail";

const WIZARD_TOTAL_STEPS = 5;

export function CreateBusinessPage() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const { createBusiness } = useTenantConfig();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<VerticalId | null>(null);
  const [type, setType] = useState<TypeCode | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [enabled, setEnabled] = useState<ModuleId[]>([...baseModuleIds]);

  // Re-derive the module set whenever the type or an answer changes, same
  // rule the 10-step signup flow uses.
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

  const branchCount = useMemo(() => {
    if (!type) return 1;
    const question = questionsFor(type).find((q) => q.id === "branches");
    const option = question?.options.find((o) => o.id === answers.branches);
    return option?.branchCount ?? 1;
  }, [type, answers.branches]);

  function handleSelectType(code: TypeCode) {
    setType(code);
    setAnswers({});
  }

  function handleToggleModule(id: ModuleId, next: boolean) {
    setEnabled((prev) => (next ? withDependencies([...prev, id]) : withoutDependents(prev, id)));
  }

  function handleCreate() {
    if (!vertical || !type) return;
    const businessName = name.trim();
    createBusiness({
      businessName,
      vertical,
      businessType: type,
      enabledModules: enabled,
      branchCount,
    });
    navigate("/settings/businesses", { replace: true, state: { created: businessName } });
  }

  const canContinue =
    step === 1 ? name.trim() !== "" :
    step === 2 ? vertical !== null :
    step === 3 ? type !== null :
    true;

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="px-4 pb-10 pt-4 sm:px-[26px] sm:pt-5">
      <button
        type="button"
        onClick={() => navigate("/settings/businesses")}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]"
      >
        <BackArrow size={14} />
        {t("settings.businesses.title")}
      </button>

      <h1 className="mt-3 text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
        {t("settings.businesses.wizard.title")}
      </h1>

      <div className="mt-5 max-w-[960px]">
        <StepRail step={step} total={WIZARD_TOTAL_STEPS} labelPrefix="settings.businesses.wizard.rail.step" />
      </div>

      <div className="mt-7 max-w-[960px]">
        {step === 1 && (
          <section className="mx-auto w-full max-w-[560px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-7">
            <Input
              label={t("settings.businesses.wizard.nameLabel")}
              icon={<Building2 size={15} />}
              placeholder={t("settings.businesses.wizard.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="!py-2.5 !text-[13.5px]"
            />
          </section>
        )}
        {step === 2 && <VerticalStep selected={vertical} onSelect={setVertical} />}
        {step === 3 && <TypeStep selected={type} onSelect={handleSelectType} />}
        {step === 4 && type && (
          <QuestionsStep
            type={type}
            answers={answers}
            onAnswer={(questionId, optionId) => setAnswers((prev) => ({ ...prev, [questionId]: optionId }))}
          />
        )}
        {step === 5 && type && (
          <ModulesStep type={type} answers={answers} enabled={enabled} onToggle={handleToggleModule} />
        )}
      </div>

      <div className="mt-8 flex max-w-[960px] items-center justify-end gap-2 border-t border-[var(--octo-border-card)] pt-4">
        {step > 1 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} icon={<BackArrow size={14} />}>
            {t("onboarding.back")}
          </Button>
        )}
        {step < WIZARD_TOTAL_STEPS ? (
          <Button variant="primary" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
            {t("onboarding.next")}
          </Button>
        ) : (
          <Button variant="primary" onClick={handleCreate}>
            {t("settings.businesses.wizard.create")}
          </Button>
        )}
      </div>
    </div>
  );
}
