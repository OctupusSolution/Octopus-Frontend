import { useState, type ReactNode } from "react";
import { BriefcaseBusiness, ChevronDown, Eye, EyeOff, KeyRound, Lock, LockOpen, ShieldCheck, UserRound } from "lucide-react";
import clsx from "clsx";
import {
  ACCESS_LEVELS,
  LANGUAGE_OPTIONS,
  TWO_FACTOR_METHODS,
  branches,
  type Branch,
  type LoginMethod,
  type MemberProfile,
  type ModuleId,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { ConfirmModal } from "./_shared/confirm-modal";
import { Field, SelectInput, TextInput } from "./_shared/form";
import { EMAIL_RE, PHONE_RE, useStaffLabels } from "./_shared/labels";
import { useStaffStore } from "./_shared/staff-store";
import { Switch } from "./_shared/switch";
import { useLocalName, useTx } from "./_shared/text";
import { useAssignableRoles } from "./_shared/use-assignable-roles";
import { InvitationPanel } from "./invitation-panel";
import { ActivityAuditCard } from "./activity-audit-card";
import { MemberSummaryCard } from "./member-summary-card";
import { ModulesSelect } from "./modules-select";

export interface MemberDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: "Male" | "Female";
  nationality: string;
  languages: string;
  jobTitle: string;
  branch: Branch;
  department: string;
  reportsTo: string;
  hireDate: string;
  employmentType: "Full time" | "Part time";
  status: "Active" | "Inactive";
  assignedRole: string;
  accessLevel: string;
  modulesAccess: ModuleId[];
  loginMethod: LoginMethod;
  pinCode: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  allowSystemLogin: boolean;
  allowAccessOutsideBranch: boolean;
}

function draftFrom(p: MemberProfile, inactive: boolean): MemberDraft {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.employee.phone,
    email: p.email,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    nationality: p.nationality,
    languages: p.languages,
    jobTitle: p.jobTitle,
    branch: p.employee.branch,
    department: p.department,
    reportsTo: p.reportsTo,
    hireDate: p.employee.hireDate,
    employmentType: p.employmentType,
    status: inactive ? "Inactive" : "Active",
    assignedRole: p.assignedRole,
    accessLevel: p.accessLevel,
    modulesAccess: [...p.modulesAccess],
    loginMethod: p.loginMethod,
    pinCode: p.pinCode,
    twoFactorEnabled: p.twoFactorEnabled,
    twoFactorMethod: p.twoFactorMethod,
    allowSystemLogin: p.allowSystemLogin,
    allowAccessOutsideBranch: p.allowAccessOutsideBranch,
  };
}

type SectionId = "personal" | "work" | "access" | "login" | "controls";
type Errors = Partial<Record<keyof MemberDraft, string>>;

const FIELD_SECTION: Partial<Record<keyof MemberDraft, SectionId>> = {
  firstName: "personal",
  lastName: "personal",
  phone: "personal",
  email: "personal",
  pinCode: "login",
};

const LOGIN_METHODS: LoginMethod[] = ["PIN", "Password", "Both"];

function Section({
  id,
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  icon: ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const bodyId = `member-section-${id}`;
  return (
    <section className="rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 rounded-[16px] px-4 py-4 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D6EFD]/40"
        >
          <span className="flex items-center gap-2.5 text-[16px] font-semibold text-[var(--octo-text-primary)]">
            {icon}
            {title}
          </span>
          <ChevronDown size={20} aria-hidden className={clsx("shrink-0 text-[var(--octo-text-primary)] transition-transform", open && "rotate-180")} />
        </button>
      </h2>
      {open && (
        <div id={bodyId} className="px-4 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}

function SwitchRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <Switch checked={checked} onChange={onChange} label={label} />
      <span className="text-[14px] text-[var(--octo-text-primary)]">{label}</span>
    </label>
  );
}

export function MemberDetails({
  profile,
  inactive,
  onSave,
  onLockChange,
  notify,
}: {
  profile: MemberProfile;
  inactive: boolean;
  onSave: (draft: MemberDraft) => void;
  onLockChange: (locked: boolean) => void;
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const { t } = useI18n();
  const tx = useTx();
  const localName = useLocalName();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const [baseline, setBaseline] = useState(() => draftFrom(profile, inactive));
  const [draft, setDraft] = useState(baseline);
  const [errors, setErrors] = useState<Errors>({});
  const [openSections, setOpenSections] = useState<Set<SectionId>>(() => new Set(["personal"]));
  const [pinVisible, setPinVisible] = useState(false);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const set = <K extends keyof MemberDraft>(key: K, value: MemberDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const toggleSection = (id: SectionId) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = () => {
    const next: Errors = {};
    if (!draft.firstName.trim()) next.firstName = t("staff.validation.required");
    if (!draft.lastName.trim()) next.lastName = t("staff.validation.required");
    if (!draft.phone.trim()) next.phone = t("staff.validation.required");
    else if (!PHONE_RE.test(draft.phone.trim())) next.phone = t("staff.validation.phone");
    if (draft.email.trim() && !EMAIL_RE.test(draft.email.trim())) next.email = t("staff.validation.email");
    if (draft.loginMethod !== "Password" && !/^\d{4,6}$/.test(draft.pinCode)) next.pinCode = t("staff.validation.pin");

    if (Object.keys(next).length) {
      setErrors(next);
      const sections = Object.keys(next)
        .map((k) => FIELD_SECTION[k as keyof MemberDraft])
        .filter((s): s is SectionId => Boolean(s));
      setOpenSections((prev) => new Set([...prev, ...sections]));
      notify(t("staff.toast.fixErrors"), "error");
      return;
    }
    onSave(draft);
    setBaseline(draft);
  };

  const discard = () => {
    setDraft(baseline);
    setErrors({});
  };

  const resetPin = () => {
    set("pinCode", String(Math.floor(1000 + Math.random() * 9000)));
    setPinVisible(true);
    notify(t("staff.toast.pinReset"));
  };

  const status = profile.locked ? "locked" : inactive ? "inactive" : "active";
  const managers = store.employees.filter(
    (e) => e.id !== profile.employee.id && (e.role === "Owner" || e.role === "Branch Manager")
  );
  const managerNames = managers.map((m) => m.name);
  if (draft.reportsTo && !managerNames.includes(draft.reportsTo)) managerNames.unshift(draft.reportsTo);
  const roleOptions = useAssignableRoles(draft.assignedRole);
  // The business's own catalogs; a deactivated entry stays listed only for the member who holds it.
  const jobTitles = store.jobTitles.filter((j) => j.isActive || j.id === draft.jobTitle);
  const departments = store.departments.filter((d) => d.isActive || d.id === draft.department);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[268px_minmax(0,1fr)_268px]">
      <MemberSummaryCard profile={profile} status={status} showSessions className="lg:sticky lg:top-4" />

      <div className="flex min-w-0 flex-col gap-4">
        {profile.locked && (
          <div role="status" className="flex items-center gap-2.5 rounded-[12px] bg-[var(--octo-tone-danger-bg)] px-4 py-3 text-[13px] font-medium text-[var(--octo-tone-danger-text)]">
            <Lock size={16} aria-hidden className="shrink-0" />
            {t("staff.member.lockedBanner").replace("{name}", profile.employee.name)}
          </div>
        )}

        <Section id="personal" icon={<UserRound size={22} strokeWidth={1.7} />} title={t("staff.member.personalInfo")} open={openSections.has("personal")} onToggle={() => toggleSection("personal")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("staff.member.field.firstName")} htmlFor="m-first" error={errors.firstName}>
              <TextInput id="m-first" value={draft.firstName} invalid={!!errors.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label={t("staff.member.field.lastName")} htmlFor="m-last" error={errors.lastName}>
              <TextInput id="m-last" value={draft.lastName} invalid={!!errors.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label={t("staff.member.field.phoneNumber")} htmlFor="m-phone" error={errors.phone}>
              <TextInput id="m-phone" type="tel" dir="ltr" value={draft.phone} invalid={!!errors.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label={t("staff.member.field.email")} htmlFor="m-email" error={errors.email}>
              <TextInput id="m-email" type="email" dir="ltr" value={draft.email} invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label={t("staff.member.field.dateOfBirth")} htmlFor="m-dob">
              <TextInput id="m-dob" type="date" value={draft.dateOfBirth} max={draft.hireDate || undefined} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
            <Field label={t("staff.member.field.gender")} htmlFor="m-gender">
              <SelectInput id="m-gender" value={draft.gender} onChange={(e) => set("gender", e.target.value as MemberDraft["gender"])}>
                <option value="Male">{t("staff.member.gender.male")}</option>
                <option value="Female">{t("staff.member.gender.female")}</option>
              </SelectInput>
            </Field>
            <Field label={t("staff.member.field.nationality")} htmlFor="m-nationality">
              <TextInput id="m-nationality" value={labels.data("staff.nationality", draft.nationality)} onChange={(e) => set("nationality", e.target.value)} />
            </Field>
            <Field label={t("staff.member.field.language")} htmlFor="m-language">
              <SelectInput id="m-language" value={draft.languages} onChange={(e) => set("languages", e.target.value)}>
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>{labels.data("staff.language", l)}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
        </Section>

        <Section id="work" icon={<BriefcaseBusiness size={22} strokeWidth={1.7} />} title={t("staff.member.workInfo")} open={openSections.has("work")} onToggle={() => toggleSection("work")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("staff.member.field.jobTitle")} htmlFor="m-title">
              <SelectInput id="m-title" value={draft.jobTitle} onChange={(e) => set("jobTitle", e.target.value)}>
                <option value="">{tx("No job title", "بدون مسمى وظيفي")}</option>
                {jobTitles.map((j) => (
                  <option key={j.id} value={j.id}>{localName(j)}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t("staff.member.field.branch")} htmlFor="m-branch">
              <SelectInput id="m-branch" value={draft.branch} onChange={(e) => set("branch", e.target.value as Branch)}>
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t("staff.member.field.department")} htmlFor="m-dept">
              <SelectInput id="m-dept" value={draft.department} onChange={(e) => set("department", e.target.value)}>
                <option value="">{tx("No department", "بدون قسم")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{localName(d)}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t("staff.member.field.reportsTo")} htmlFor="m-reports">
              <SelectInput id="m-reports" value={draft.reportsTo} onChange={(e) => set("reportsTo", e.target.value)}>
                <option value="">{t("staff.member.field.noManager")}</option>
                {managerNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t("staff.member.field.hireDate")} htmlFor="m-hire">
              <TextInput id="m-hire" type="date" value={draft.hireDate} onChange={(e) => set("hireDate", e.target.value)} />
            </Field>
            <Field label={t("staff.member.field.employmentType")} htmlFor="m-type">
              <SelectInput id="m-type" value={draft.employmentType} onChange={(e) => set("employmentType", e.target.value as MemberDraft["employmentType"])}>
                <option value="Full time">{t("staff.member.employment.fullTime")}</option>
                <option value="Part time">{t("staff.member.employment.partTime")}</option>
              </SelectInput>
            </Field>
            <Field label={t("staff.member.field.status")} htmlFor="m-status" className="sm:col-span-2">
              <SelectInput
                id="m-status"
                value={draft.status}
                onChange={(e) => set("status", e.target.value as MemberDraft["status"])}
                className={draft.status === "Active" ? "text-[var(--octo-tone-success-text)]" : undefined}
              >
                <option value="Active">{t("staff.status.active")}</option>
                <option value="Inactive">{t("staff.status.inactive")}</option>
              </SelectInput>
            </Field>
          </div>
        </Section>

        <Section id="access" icon={<ShieldCheck size={22} strokeWidth={1.7} />} title={t("staff.member.roleAccess")} open={openSections.has("access")} onToggle={() => toggleSection("access")}>
          <div className="flex flex-col gap-4">
            <Field label={t("staff.member.field.assignedRole")} htmlFor="m-role">
              <SelectInput id="m-role" value={draft.assignedRole} onChange={(e) => set("assignedRole", e.target.value)}>
                {!draft.assignedRole && <option value="">{tx("No role", "بدون دور")}</option>}
                {roleOptions.map((r) => (
                  <option key={r.id} value={r.id}>{labels.roleName(r)}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t("staff.member.field.accessLevel")} htmlFor="m-level">
              <SelectInput id="m-level" value={draft.accessLevel} onChange={(e) => set("accessLevel", e.target.value)}>
                {ACCESS_LEVELS.map((a) => (
                  <option key={a} value={a}>{labels.data("staff.accessLevel", a)}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t("staff.member.field.modulesAccess")} htmlFor="m-modules">
              <ModulesSelect id="m-modules" value={draft.modulesAccess} onChange={(next) => set("modulesAccess", next)} />
            </Field>
          </div>
        </Section>

        <Section id="login" icon={<KeyRound size={22} strokeWidth={1.7} />} title={t("staff.member.loginSecurity")} open={openSections.has("login")} onToggle={() => toggleSection("login")}>
          <div className="flex flex-col gap-4">
            <Field label={t("staff.member.field.loginMethod")}>
              <div role="radiogroup" aria-label={t("staff.member.field.loginMethod")} className="flex flex-wrap gap-2 rounded-[10px] bg-[var(--octo-hover)] p-2">
                {LOGIN_METHODS.map((method) => {
                  const active = draft.loginMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set("loginMethod", method)}
                      className={clsx(
                        "h-9 rounded-[8px] border bg-[var(--octo-card)] px-3.5 text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                        active ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
                      )}
                    >
                      {t(`staff.member.loginMethod.${method.toLowerCase()}`)}
                    </button>
                  );
                })}
              </div>
            </Field>

            {draft.loginMethod !== "Password" && (
              <div>
                <Field label={t("staff.member.field.pinCode")} htmlFor="m-pin" error={errors.pinCode} hint={t("staff.member.pinHint")}>
                  <TextInput
                    id="m-pin"
                    type={pinVisible ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="off"
                    dir="ltr"
                    maxLength={6}
                    value={draft.pinCode}
                    invalid={!!errors.pinCode}
                    onChange={(e) => set("pinCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setPinVisible((v) => !v)}
                        aria-label={t(pinVisible ? "staff.member.hidePin" : "staff.member.showPin")}
                        aria-pressed={pinVisible}
                        className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                      >
                        {pinVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                </Field>
                <div className="mt-1 flex justify-end">
                  <button type="button" onClick={resetPin} className="text-[13px] font-medium text-[#0D6EFD] underline underline-offset-2 hover:no-underline">
                    {t("staff.member.field.resetPinCode")}
                  </button>
                </div>
              </div>
            )}

            {draft.loginMethod !== "PIN" && (
              <div>
                <Field label={t("staff.member.field.password")} htmlFor="m-password" hint={t("staff.member.passwordHint")}>
                  <TextInput id="m-password" type="password" dir="ltr" value="password" readOnly />
                </Field>
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => notify(t("staff.toast.passwordResetSent").replace("{email}", draft.email || profile.email))}
                    className="text-[13px] font-medium text-[#0D6EFD] underline underline-offset-2 hover:no-underline"
                  >
                    {t("staff.member.field.sendPasswordReset")}
                  </button>
                </div>
              </div>
            )}

            <SwitchRow checked={draft.twoFactorEnabled} onChange={(v) => set("twoFactorEnabled", v)} label={t("staff.member.field.twoFactor")} />
            <Field label={t("staff.member.field.preferred2fa")} htmlFor="m-2fa">
              <SelectInput id="m-2fa" value={draft.twoFactorMethod} disabled={!draft.twoFactorEnabled} onChange={(e) => set("twoFactorMethod", e.target.value)}>
                {TWO_FACTOR_METHODS.map((m) => (
                  <option key={m} value={m}>{labels.data("staff.twoFactor", m)}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
        </Section>

        <Section id="controls" icon={<Lock size={22} strokeWidth={1.7} />} title={t("staff.member.accessControls")} open={openSections.has("controls")} onToggle={() => toggleSection("controls")}>
          <div className="flex flex-col gap-4">
            <SwitchRow checked={draft.allowSystemLogin} onChange={(v) => set("allowSystemLogin", v)} label={t("staff.member.field.allowSystemLogin")} />
            <div className="flex flex-col gap-1">
              <SwitchRow checked={draft.allowAccessOutsideBranch} onChange={(v) => set("allowAccessOutsideBranch", v)} label={t("staff.member.field.allowAccessOutsideBranch")} />
              <span className="ps-[52px] text-[12px] text-[var(--octo-text-muted)]">
                {tx(
                  "Off: the member acts in their assigned branch only. On: across the whole business. You cannot grant wider reach than your own.",
                  "إيقاف: يعمل الموظف في فرعه فقط. تشغيل: في كل فروع النشاط. لا يمكنك منح نطاق أوسع من نطاقك."
                )}
              </span>
            </div>
            <InvitationPanel employeeId={profile.employee.id} notify={notify} />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] text-[var(--octo-text-primary)]">
                {t(profile.locked ? "staff.member.field.unlockAccountPrompt" : "staff.member.field.lockAccountPrompt")}
              </span>
              {profile.locked ? (
                <button type="button" onClick={() => onLockChange(false)} className={buttonClass("secondary", "sm")}>
                  <LockOpen size={16} />
                  {t("staff.member.field.unlockAccount")}
                </button>
              ) : (
                <button type="button" onClick={() => setLockConfirmOpen(true)} className={buttonClass("danger", "sm")}>
                  <Lock size={16} />
                  {t("staff.member.field.lockAccount")}
                </button>
              )}
            </div>
          </div>
        </Section>

        {dirty && (
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3 shadow-[0_12px_32px_rgba(16,24,40,0.14)]">
            <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">{t("staff.member.unsaved")}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={discard} className={buttonClass("secondary")}>{t("staff.member.discard")}</button>
              <button type="button" onClick={save} className={buttonClass("primary")}>{t("staff.member.saveChanges")}</button>
            </div>
          </div>
        )}
      </div>

      <ActivityAuditCard employeeId={profile.employee.id} name={profile.employee.name} className="lg:col-span-2 xl:sticky xl:top-4 xl:col-span-1" />

      <ConfirmModal
        open={lockConfirmOpen}
        title={t("staff.member.lockConfirmTitle")}
        body={t("staff.member.lockConfirmBody").replace("{name}", profile.employee.name)}
        confirmLabel={t("staff.member.field.lockAccount")}
        cancelLabel={t("common.cancel")}
        onClose={() => setLockConfirmOpen(false)}
        onConfirm={() => onLockChange(true)}
      />
    </div>
  );
}
