import { useState } from "react";
import { Modal } from "@ui/primitives";
import { LANGUAGE_OPTIONS, TODAY, branches, staffRoles, type Branch, type Employee, type StaffRole } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { Field, SelectInput, TextInput } from "./_shared/form";
import { EMAIL_RE, PHONE_RE, useStaffLabels } from "./_shared/labels";
import { toISO } from "./_shared/format";
import { useStaffStore } from "./_shared/staff-store";

interface AddMemberForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  languages: string;
  branch: Branch;
  role: StaffRole;
  employmentType: "Full time" | "Part time";
}

const EMPTY: AddMemberForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  nationality: "",
  languages: LANGUAGE_OPTIONS[0],
  branch: branches[0],
  role: "Waiter",
  employmentType: "Full time",
};

export function AddMemberModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string) => void }) {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const [form, setForm] = useState<AddMemberForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AddMemberForm, string>>>({});

  const set = <K extends keyof AddMemberForm>(key: K, value: AddMemberForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const close = () => {
    setForm(EMPTY);
    setErrors({});
    onClose();
  };

  const submit = () => {
    const next: typeof errors = {};
    if (!form.firstName.trim()) next.firstName = t("staff.validation.required");
    if (!form.lastName.trim()) next.lastName = t("staff.validation.required");
    if (!form.phone.trim()) next.phone = t("staff.validation.required");
    else if (!PHONE_RE.test(form.phone.trim())) next.phone = t("staff.validation.phone");
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = t("staff.validation.email");
    if (form.dateOfBirth) {
      const [y, m, d] = TODAY.split("-");
      if (form.dateOfBirth > `${Number(y) - 16}-${m}-${d}`) next.dateOfBirth = t("staff.validation.minAge");
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const highest = store.employees.reduce((max, e) => Math.max(max, Number(e.id.replace(/\D/g, "")) || 0), 0);
    const employee: Employee = {
      id: `EMP-${String(highest + 1).padStart(3, "0")}`,
      name,
      nameAr: name,
      phone: form.phone.trim(),
      role: form.role,
      branch: form.branch,
      status: "Off Duty",
      todayShift: "—",
      hoursThisWeek: 0,
      attendance: 100,
      hireDate: toISO(new Date()),
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
      languages: form.languages,
    });
    onCreated(name);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("staff.addMember.title")}
      className="max-w-xl"
      footer={
        <>
          <button type="button" onClick={close} className={buttonClass("secondary")}>{t("common.cancel")}</button>
          <button type="button" onClick={submit} className={buttonClass("primary")}>{t("staff.addMember.save")}</button>
        </>
      }
    >
      <p className="-mt-1 mb-4 text-[13px] text-[var(--octo-text-secondary)]">{t("staff.addMember.subtitle")}</p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label={t("staff.member.field.firstName")} htmlFor="add-first" error={errors.firstName}>
          <TextInput id="add-first" autoFocus value={form.firstName} invalid={!!errors.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label={t("staff.member.field.lastName")} htmlFor="add-last" error={errors.lastName}>
          <TextInput id="add-last" value={form.lastName} invalid={!!errors.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label={t("staff.member.field.phoneNumber")} htmlFor="add-phone" error={errors.phone}>
          <TextInput
            id="add-phone"
            type="tel"
            dir="ltr"
            placeholder="+966 5X XXX XXXX"
            value={form.phone}
            invalid={!!errors.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label={t("staff.member.field.email")} htmlFor="add-email" error={errors.email} hint={t("staff.addMember.optional")}>
          <TextInput
            id="add-email"
            type="email"
            dir="ltr"
            placeholder="name@example.com"
            value={form.email}
            invalid={!!errors.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label={t("staff.member.field.dateOfBirth")} htmlFor="add-dob" error={errors.dateOfBirth}>
          <TextInput id="add-dob" type="date" max={TODAY} value={form.dateOfBirth} invalid={!!errors.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
        </Field>
        <Field label={t("staff.member.field.nationality")} htmlFor="add-nationality">
          <TextInput id="add-nationality" placeholder={t("staff.addMember.nationalityPlaceholder")} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
        </Field>
        <Field label={t("staff.member.field.language")} htmlFor="add-language" className="sm:col-span-2">
          <SelectInput id="add-language" value={form.languages} onChange={(e) => set("languages", e.target.value)}>
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l} value={l}>{labels.data("staff.language", l)}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.member.field.branch")} htmlFor="add-branch">
          <SelectInput id="add-branch" value={form.branch} onChange={(e) => set("branch", e.target.value as Branch)}>
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.addMember.position")} htmlFor="add-role">
          <SelectInput id="add-role" value={form.role} onChange={(e) => set("role", e.target.value as StaffRole)}>
            {staffRoles
              .filter((r) => r !== "Owner")
              .map((r) => (
                <option key={r} value={r}>{labels.staffRole(r)}</option>
              ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.member.field.employmentType")} htmlFor="add-type" className="sm:col-span-2">
          <SelectInput id="add-type" value={form.employmentType} onChange={(e) => set("employmentType", e.target.value as AddMemberForm["employmentType"])}>
            <option value="Full time">{t("staff.member.employment.fullTime")}</option>
            <option value="Part time">{t("staff.member.employment.partTime")}</option>
          </SelectInput>
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
