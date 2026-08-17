import { useEffect, useMemo, useState } from "react";
import { Building2, CircleCheck, Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig, type TenantConfig } from "@/app/providers/tenant-config-provider";
import {
  baseModuleIds, defaultModulesFor, getRestaurantType, getVertical, questionsFor,
  withDependencies, withoutDependents,
  type ModuleId, type TypeCode, type VerticalId,
} from "@/shared/catalog";
import { VerticalStep, TypeStep, QuestionsStep, ModulesStep, type Answers } from "@/widgets/business-wizard";

const WIZARD_TOTAL_STEPS = 5;

function formatCreatedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function BusinessCard({
  business,
  active,
  onSwitch,
}: {
  business: TenantConfig;
  active: boolean;
  onSwitch: () => void;
}) {
  const { t, locale } = useI18n();
  const vertical = getVertical(business.vertical);
  const type = getRestaurantType(business.businessType);

  return (
    <article className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
            {business.businessName}
          </p>
          <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">
            {t("settings.businesses.branchCount").replace("{n}", String(business.branchCount))}
            {" · "}
            {formatCreatedAt(business.createdAt, locale)}
          </p>
        </div>
        {active && <Badge tone="success">{t("settings.businesses.active")}</Badge>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {vertical && <Badge tone="neutral">{t(vertical.nameKey)}</Badge>}
        {type && <Badge tone="neutral">{t(type.nameKey)}</Badge>}
      </div>

      <div className="mt-auto pt-4">
        {active ? (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            {t("settings.businesses.active")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="w-full" onClick={onSwitch}>
            {t("settings.businesses.switch")}
          </Button>
        )}
      </div>
    </article>
  );
}

function CreateBusinessModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const { t } = useI18n();
  const { createBusiness } = useTenantConfig();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<VerticalId | null>(null);
  const [type, setType] = useState<TypeCode | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [enabled, setEnabled] = useState<ModuleId[]>([...baseModuleIds]);

  // Reset to a blank wizard every time it's reopened.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName("");
    setVertical(null);
    setType(null);
    setAnswers({});
    setEnabled([...baseModuleIds]);
  }, [open]);

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
    onCreated(businessName);
  }

  const canContinue =
    step === 1 ? name.trim() !== "" :
    step === 2 ? vertical !== null :
    step === 3 ? type !== null :
    true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-2xl"
      title={t("settings.businesses.wizard.title")}
      footer={
        <>
          {step > 1 && (
            <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)}>
              {t("onboarding.back")}
            </Button>
          )}
          {step < WIZARD_TOTAL_STEPS ? (
            <Button variant="primary" size="sm" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
              {t("onboarding.next")}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleCreate}>
              {t("settings.businesses.wizard.create")}
            </Button>
          )}
        </>
      }
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#0D6EFD]">
        {t("onboarding.step").replace("{n}", String(step)).replace("{total}", String(WIZARD_TOTAL_STEPS))}
      </p>

      <div className="octo-scroll mt-3 max-h-[55vh] overflow-y-auto pe-1">
        {step === 1 && (
          <Input
            label={t("settings.businesses.wizard.nameLabel")}
            placeholder={t("settings.businesses.wizard.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
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
    </Modal>
  );
}

export function BusinessesSettingsPage() {
  const { t } = useI18n();
  const { businesses, activeTenantId, switchBusiness } = useTenantConfig();
  const [toast, setToast] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  function handleSwitch(business: TenantConfig) {
    switchBusiness(business.id);
    setToast(t("settings.businesses.switched").replace("{name}", business.businessName));
  }

  function handleCreated(name: string) {
    setWizardOpen(false);
    setToast(t("settings.businesses.created").replace("{name}", name));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.businesses.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.businesses.subtitle")}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setWizardOpen(true)}>
          {t("settings.businesses.create")}
        </Button>
      </header>

      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {t("settings.businesses.title")}
          </h2>
          <span className="text-[11.5px] text-[var(--octo-text-faint)]">{businesses.length}</span>
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            icon={<Building2 size={18} />}
            title={t("settings.businesses.emptyTitle")}
            description={t("settings.businesses.emptyBody")}
            action={
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setWizardOpen(true)}>
                {t("settings.businesses.create")}
              </Button>
            }
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                active={business.id === activeTenantId}
                onSwitch={() => handleSwitch(business)}
              />
            ))}
          </div>
        )}
      </section>

      <CreateBusinessModal open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={handleCreated} />

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
