import { useState } from "react";
import clsx from "clsx";
import { LANGUAGE_OPTIONS, TODAY, branches, type Branch, type Employee, type StaffRole } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { DateInput, Field, SelectInput, TextInput } from "./_shared/form";
import { toISO } from "./_shared/format";
import { StaffIcon } from "./_shared/icon";
import { EMAIL_RE, PHONE_RE, useStaffLabels } from "./_shared/labels";
import { StaffModal } from "./_shared/staff-modal";
import { useStaffStore } from "./_shared/staff-store";
import { useLocalName, useTx } from "./_shared/text";
import { INK, INK_LINK, INK_MUTED, INK_SOFT } from "./_shared/theme";
import { useAssignableRoles } from "./_shared/use-assignable-roles";

// Multi-colour artwork from the frame, so it is an <img> rather than a mask.
const FLAG_URL = new URL("../../../../assets/Dashboard/icons/form-flag-sa.png", import.meta.url).href;
const DIAL_CODE = "+966";

type Step = 1 | 2;

interface AddMemberForm {
  firstName: string;
  lastName: string;
  /** Digits after the +966 the field shows in front. */
  phone: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  languages: string;
  gender: "Male" | "Female";
  branch: Branch;
  /** Ids from the business's catalogs / roles; "" = none. */
  jobTitleId: string;
  departmentId: string;
  roleId: string;
  reportsTo: string;
  hireDate: string;
  employmentType: "Full time" | "Part time";
}

function emptyForm(): AddMemberForm {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    nationality: "",
    languages: LANGUAGE_OPTIONS[0],
    gender: "Male",
    branch: branches[0],
    jobTitleId: "",
    departmentId: "",
    roleId: "",
    reportsTo: "",
    hireDate: toISO(new Date()),
    employmentType: "Full time",
  };
}

type Errors = Partial<Record<keyof AddMemberForm, string>>;

// The frame's two-stop progress rail: numbered 24px stops with their labels
// centred beneath, joined by a 4px track that fills blue up to the current stop.
function Stepper({ step, labels, onStep }: { step: Step; labels: [string, string]; onStep: (step: Step) => void }) {
  return (
    <div className="relative flex items-start justify-between">
      <span aria-hidden className="absolute inset-x-[8.5%] top-[10px] h-1 overflow-hidden rounded-full bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-track)]">
        <span className="absolute inset-0 bg-[#0D6EFD]" />
      </span>
      {([1, 2] as const).map((n) => {
        const current = step === n;
        const done = step > n;
        return (
          <button
            key={n}
            type="button"
            aria-current={current ? "step" : undefined}
            onClick={() => onStep(n)}
            className={clsx(
              "relative flex flex-col items-center gap-2 rounded-[4px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
              n === 1 ? "min-w-[20.13%]" : "min-w-[12.89%]"
            )}
          >
            <span
              className={clsx(
                "grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold leading-3",
                done
                  ? "bg-[#0D6EFD] text-white"
                  : current
                    ? clsx("border border-[#0D6EFD] bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[var(--octo-card)]", INK_LINK)
                    : clsx("bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-track)]", INK_MUTED)
              )}
            >
              {n}
            </span>
            <span className={clsx("text-[14px] leading-[14px]", current || done ? INK_LINK : INK_SOFT)}>{labels[n - 1]}</span>
          </button>
        );
      })}
    </div>
  );
}

function GenderOption({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={clsx(
        "flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-[12px] border px-2 text-[14px] font-medium leading-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
        checked ? clsx("border-[#0D6EFD]", INK_LINK) : clsx("border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]", INK_SOFT)
      )}
    >
      <StaffIcon
        name={checked ? "form-radio-on.svg" : "form-radio-off.svg"}
        size={24}
        className={checked ? "text-[#0D6EFD]" : "text-[#64748b] [[data-theme=dark]_&]:text-[var(--octo-text-muted)]"}
      />
      {label}
    </button>
  );
}

// The Work Info step sets its labels flush with the fields, 8px above them.
const WORK_FIELD = "gap-2 [&>label]:px-0";

export function AddMemberModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string) => void }) {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const tx = useTx();
  const localName = useLocalName();
  const assignable = useAssignableRoles();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<AddMemberForm>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof AddMemberForm>(key: K, value: AddMemberForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const close = () => {
    setForm(emptyForm());
    setErrors({});
    setStep(1);
    onClose();
  };

  const phone = `${DIAL_CODE}${form.phone.replace(/\s/g, "")}`;

  const personalErrors = (): Errors => {
    const next: Errors = {};
    if (!form.firstName.trim()) next.firstName = t("staff.validation.required");
    if (!form.lastName.trim()) next.lastName = t("staff.validation.required");
    if (!form.phone.trim()) next.phone = t("staff.validation.required");
    else if (!PHONE_RE.test(phone)) next.phone = t("staff.validation.phone");
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = t("staff.validation.email");
    if (form.dateOfBirth) {
      const [y, m, d] = TODAY.split("-");
      if (form.dateOfBirth > `${Number(y) - 16}-${m}-${d}`) next.dateOfBirth = t("staff.validation.minAge");
    }
    return next;
  };

  const goTo = (target: Step) => {
    if (target === 2) {
      const next = personalErrors();
      if (Object.keys(next).length) {
        setErrors(next);
        return;
      }
    }
    setStep(target);
  };

  const submit = () => {
    const next = personalErrors();
    if (Object.keys(next).length) {
      setErrors(next);
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }

    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const role = assignable.find((r) => r.id === form.roleId);
    const highest = store.employees.reduce((max, e) => Math.max(max, Number(e.id.replace(/\D/g, "")) || 0), 0);
    const employee: Employee = {
      id: `EMP-${String(highest + 1).padStart(3, "0")}`,
      name,
      nameAr: name,
      phone,
      role: (role?.name ?? "") as StaffRole,
      branch: form.branch,
      status: "Off Duty",
      todayShift: "—",
      hoursThisWeek: 0,
      attendance: 100,
      hireDate: form.hireDate || toISO(new Date()),
      iqamaExpiry: "",
      contractType: form.employmentType === "Full time" ? "Full-time" : "Part-time",
      salaryBandMin: 0,
      salaryBandMax: 0,
      emergencyContactName: "",
      emergencyContactPhone: "",
      documents: [],
    };
    store.addEmployee(employee, {
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
      ...(form.nationality.trim() ? { nationality: form.nationality.trim() } : {}),
      ...(form.reportsTo ? { reportsTo: form.reportsTo } : {}),
      languages: form.languages,
      gender: form.gender,
      jobTitle: form.jobTitleId,
      department: form.departmentId,
      assignedRole: form.roleId,
    });
    onCreated(name);
    close();
  };

  const managers = store.employees.filter((e) => e.role === "Owner" || e.role === "Branch Manager");
  const incomplete = !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim();

  return (
    <StaffModal
      open={open}
      onClose={close}
      title={t("staff.addMember.title")}
      // The frame dims the action until the required fields are in; it stays
      // clickable so pressing it points at what is missing.
      submitLabel={step === 1 ? tx("Next", "التالي") : t("staff.addMember.save")}
      onSubmit={submit}
      className={step === 1 && incomplete ? "[&_button[type=submit]]:opacity-50" : undefined}
    >
      <Stepper step={step} labels={[t("staff.member.personalInfo"), t("staff.member.workInfo")]} onStep={goTo} />

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label={t("staff.member.field.firstName")} htmlFor="add-first" error={errors.firstName} required>
              <TextInput
                id="add-first"
                autoFocus
                placeholder={tx("Enter member first name", "أدخل الاسم الأول")}
                value={form.firstName}
                invalid={!!errors.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </Field>
            <Field label={t("staff.member.field.lastName")} htmlFor="add-last" error={errors.lastName} required>
              <TextInput
                id="add-last"
                placeholder={tx("Enter member last name", "أدخل اسم العائلة")}
                value={form.lastName}
                invalid={!!errors.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </Field>
          </div>
          <Field label={t("staff.member.field.phoneNumber")} htmlFor="add-phone" error={errors.phone} required>
            <div
              className={clsx(
                "flex h-10 items-center rounded-[12px] border bg-[var(--octo-card)] px-3 transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25",
                errors.phone ? "border-[#d30202]" : "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
              )}
            >
              <span dir="ltr" className={clsx("flex shrink-0 items-center gap-2 text-[14px] leading-none", INK)}>
                <img src={FLAG_URL} alt="" aria-hidden width={24} height={24} className="h-6 w-6 shrink-0 object-cover" />
                {DIAL_CODE}
              </span>
              <input
                id="add-phone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                placeholder="000 000 000"
                aria-invalid={!!errors.phone || undefined}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/[^\d\s]/g, ""))}
                className={clsx(
                  "ms-1 h-[30px] w-full min-w-0 flex-1 border-s border-[#cbd5e1] bg-transparent px-2 text-[14px] leading-none outline-none placeholder:text-[#58606c] rtl:text-end [[data-theme=dark]_&]:border-[var(--octo-border-input)] [[data-theme=dark]_&]:placeholder:text-[var(--octo-text-secondary)]",
                  INK
                )}
              />
            </div>
          </Field>
          <Field label={t("staff.member.field.email")} htmlFor="add-email" error={errors.email}>
            <TextInput
              id="add-email"
              type="email"
              dir="ltr"
              placeholder={tx("Enter member email", "أدخل البريد الإلكتروني")}
              value={form.email}
              invalid={!!errors.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label={t("staff.member.field.branch")} htmlFor="add-branch" required>
            <SelectInput id="add-branch" value={form.branch} onChange={(e) => set("branch", e.target.value as Branch)}>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t("staff.member.field.dateOfBirth")} htmlFor="add-dob" error={errors.dateOfBirth}>
            <DateInput
              id="add-dob"
              max={TODAY}
              placeholder={tx("Choose member date of birth", "اختر تاريخ الميلاد")}
              value={form.dateOfBirth}
              invalid={!!errors.dateOfBirth}
              onChange={(iso) => set("dateOfBirth", iso)}
            />
          </Field>
          <Field label={t("staff.member.field.nationality")} htmlFor="add-nationality">
            <TextInput
              id="add-nationality"
              placeholder={tx("Choose member nationality", "اختر الجنسية")}
              value={form.nationality}
              onChange={(e) => set("nationality", e.target.value)}
            />
          </Field>
          <Field label={tx("Languages", "اللغات")} htmlFor="add-language">
            <SelectInput id="add-language" value={form.languages} onChange={(e) => set("languages", e.target.value)}>
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l} value={l}>{labels.data("staff.language", l)}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t("staff.member.field.gender")}>
            <div role="radiogroup" aria-label={t("staff.member.field.gender")} className="flex gap-6">
              <GenderOption label={t("staff.member.gender.male")} checked={form.gender === "Male"} onClick={() => set("gender", "Male")} />
              <GenderOption label={t("staff.member.gender.female")} checked={form.gender === "Female"} onClick={() => set("gender", "Female")} />
            </div>
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Field
            className={WORK_FIELD}
            label={t("staff.member.field.jobTitle")}
            htmlFor="add-title"
            hint={store.jobTitles.length === 0 ? tx("Add job titles from “Job titles & departments”.", "أضف المسميات من «المسميات والأقسام».") : undefined}
          >
            <SelectInput id="add-title" autoFocus value={form.jobTitleId} onChange={(e) => set("jobTitleId", e.target.value)}>
              <option value="">{tx("No job title", "بدون مسمى وظيفي")}</option>
              {store.jobTitles
                .filter((j) => j.isActive)
                .map((j) => (
                  <option key={j.id} value={j.id}>{localName(j)}</option>
                ))}
            </SelectInput>
          </Field>
          <Field className={WORK_FIELD} label={t("staff.member.field.department")} htmlFor="add-dept">
            <SelectInput id="add-dept" value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
              <option value="">{tx("No department", "بدون قسم")}</option>
              {store.departments
                .filter((d) => d.isActive)
                .map((d) => (
                  <option key={d.id} value={d.id}>{localName(d)}</option>
                ))}
            </SelectInput>
          </Field>
          <Field className={WORK_FIELD} label={t("staff.member.field.reportsTo")} htmlFor="add-reports">
            <SelectInput id="add-reports" value={form.reportsTo} onChange={(e) => set("reportsTo", e.target.value)}>
              <option value="">{t("staff.member.field.noManager")}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field className={WORK_FIELD} label={t("staff.member.field.hireDate")} htmlFor="add-hire">
            <DateInput id="add-hire" value={form.hireDate} onChange={(iso) => set("hireDate", iso)} />
          </Field>
          <Field className={WORK_FIELD} label={t("staff.member.field.employmentType")} htmlFor="add-type">
            <SelectInput id="add-type" value={form.employmentType} onChange={(e) => set("employmentType", e.target.value as AddMemberForm["employmentType"])}>
              <option value="Full time">{t("staff.member.employment.fullTime")}</option>
              <option value="Part time">{t("staff.member.employment.partTime")}</option>
            </SelectInput>
          </Field>
          <Field
            className={WORK_FIELD}
            label={t("staff.member.field.assignedRole")}
            htmlFor="add-role"
            hint={tx("What the member may do. Job titles grant nothing.", "ما يمكن للموظف فعله. المسمى الوظيفي لا يمنح صلاحيات.")}
          >
            <SelectInput id="add-role" value={form.roleId} onChange={(e) => set("roleId", e.target.value)}>
              <option value="">{tx("No role yet", "بدون دور حاليًا")}</option>
              {assignable.map((r) => (
                <option key={r.id} value={r.id}>{labels.roleName(r)}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      )}
    </StaffModal>
  );
}
