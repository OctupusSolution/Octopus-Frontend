import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, Eye, EyeOff, User, Briefcase, ShieldCheck, KeyRound, Lock } from "lucide-react";
import { Badge, Button, Input, Select } from "@ui/primitives";
import type { MemberProfile } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12.5px]">
      <span className="text-[var(--octo-text-muted)]">{label}</span>
      <span className="text-end font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

function SummaryCard({ profile, deactivated }: { profile: MemberProfile; deactivated: boolean }) {
  const { t } = useI18n();
  const e = profile.employee;
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-[18px]">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[14px] font-bold text-[#0D6EFD]">
          {initials(e.name)}
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{e.name}</h3>
          <p className="text-[12px] text-[#0D6EFD]">{profile.jobTitle}</p>
          <Badge tone={deactivated ? "neutral" : "success"} className="mt-1">
            {deactivated ? t("staff.grid.menu.deactivate") : t("staff.member.status.active")}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--octo-divider)] pt-3">
        <Field label={t("staff.member.field.employeeId")} value={profile.employeeCode} />
        <Field label={t("staff.member.field.phone")} value={e.phone} />
        <Field label={t("staff.member.field.branch")} value={e.branch} />
        <Field label={t("staff.member.field.joined")} value={profile.activeSection.since.split(" - ")[0]} />
        <Field label={t("staff.member.field.dateOfBirth")} value="31 July 1999" />
        <Field label={t("staff.member.field.nationality")} value={profile.nationality} />
        <Field label={t("staff.member.field.language")} value={profile.languages.join(", ")} />
      </div>

      <div className="mt-3 rounded-[9px] bg-[var(--octo-tone-success-bg)] px-3 py-2.5">
        <div className="flex items-center justify-between text-[11.5px] font-semibold text-[var(--octo-tone-success-text)]">
          <span>{t("staff.member.field.activeSections")}</span>
          <Badge tone="success">{t("staff.member.status.active")}</Badge>
        </div>
        <p className="mt-1 text-[12px] text-[var(--octo-text-primary)]">{profile.activeSection.device}</p>
        <p className="text-[11px] text-[var(--octo-text-muted)]">{profile.activeSection.location}</p>
        <p className="text-[11px] text-[var(--octo-text-muted)]">{profile.activeSection.since}</p>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  expanded,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-[18px] py-[15px] text-start"
      >
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
          {icon} {title}
        </span>
        <ChevronDown size={16} className={`text-[var(--octo-text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <div className="border-t border-[var(--octo-divider)] px-[18px] py-[15px]">{children}</div>}
    </div>
  );
}

export function MemberDetails({
  profile,
  deactivated,
  onBack,
}: {
  profile: MemberProfile;
  deactivated: boolean;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["personal", "work"]));
  const [pinVisible, setPinVisible] = useState(false);
  const [pinCode, setPinCode] = useState(profile.pinCode);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(profile.twoFactorEnabled);
  const [allowSystemLogin, setAllowSystemLogin] = useState(profile.allowSystemLogin);
  const [allowOutsideBranch, setAllowOutsideBranch] = useState(profile.allowAccessOutsideBranch);
  const [locked, setLocked] = useState(false);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const e = profile.employee;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-[#0D6EFD] hover:underline"
      >
        <ChevronLeft size={14} className="rtl:rotate-180" /> {t("staff.grid.backToStaff")}
      </button>

      {locked && (
        <div className="mb-3 rounded-[9px] bg-[#fdecec] px-3 py-2 text-center text-[11.5px] font-medium text-[#dc2626]">
          {t("staff.member.status.locked")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr_320px]">
        <SummaryCard profile={profile} deactivated={deactivated} />

        <div className="flex flex-col gap-3">
          <Section icon={<User size={15} />} title={t("staff.member.personalInfo")} expanded={expanded.has("personal")} onToggle={() => toggle("personal")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label={t("staff.member.field.firstName")} defaultValue={profile.firstName} />
              <Input label={t("staff.member.field.lastName")} defaultValue={profile.lastName} />
              <Input label={t("staff.member.field.phoneNumber")} defaultValue={e.phone} />
              <Input label={t("staff.member.field.email")} defaultValue={`${profile.firstName.toLowerCase()}.${profile.lastName.toLowerCase()}@gmail.com`} />
              <Input label={t("staff.member.field.dateOfBirth")} defaultValue="31 July 1999" />
              <Select label={t("staff.member.field.gender")} defaultValue={profile.gender}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
              <Input label={t("staff.member.field.nationality")} defaultValue={profile.nationality} />
              <Select label={t("staff.member.field.language")} defaultValue={profile.languages.join(", ")}>
                <option value={profile.languages.join(", ")}>{profile.languages.join(", ")}</option>
              </Select>
            </div>
          </Section>

          <Section icon={<Briefcase size={15} />} title={t("staff.member.workInfo")} expanded={expanded.has("work")} onToggle={() => toggle("work")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label={t("staff.member.field.jobTitle")} defaultValue={profile.jobTitle}>
                <option value={profile.jobTitle}>{profile.jobTitle}</option>
              </Select>
              <Select label={t("staff.member.field.branch")} defaultValue={e.branch}>
                <option value={e.branch}>{e.branch}</option>
              </Select>
              <Select label={t("staff.member.field.department")} defaultValue={profile.department}>
                <option value={profile.department}>{profile.department}</option>
              </Select>
              <Select label={t("staff.member.field.reportsTo")} defaultValue={profile.reportsTo}>
                <option value={profile.reportsTo}>{profile.reportsTo}</option>
              </Select>
              <Input label={t("staff.member.field.hireDate")} defaultValue={e.hireDate} />
              <Select label={t("staff.member.field.employmentType")} defaultValue={profile.employmentType}>
                <option value="Full time">Full time</option>
                <option value="Part time">Part time</option>
              </Select>
              <Select label={t("staff.member.field.status")} defaultValue={deactivated ? "Inactive" : "Active"} className="sm:col-span-2">
                <option value="Active">{t("staff.member.status.active")}</option>
                <option value="Inactive">{t("staff.grid.menu.deactivate")}</option>
              </Select>
            </div>
          </Section>

          <Section icon={<ShieldCheck size={15} />} title={t("staff.member.roleAccess")} expanded={expanded.has("access")} onToggle={() => toggle("access")}>
            <div className="flex flex-col gap-3">
              <Select label={t("staff.member.field.assignedRole")} defaultValue={profile.jobTitle}>
                <option value={profile.jobTitle}>{profile.jobTitle}</option>
              </Select>
              <Select label={t("staff.member.field.accessLevel")} defaultValue={profile.accessLevel}>
                <option value={profile.accessLevel}>{profile.accessLevel}</option>
              </Select>
              <Select label={t("staff.member.field.modulesAccess")} defaultValue={profile.modulesAccess[0]}>
                <option value={profile.modulesAccess[0]}>
                  {profile.modulesAccess.slice(0, 4).join(", ")}
                  {profile.modulesAccess.length > 4 ? ` +${profile.modulesAccess.length - 4}` : ""}
                </option>
              </Select>
            </div>
          </Section>

          <Section icon={<KeyRound size={15} />} title={t("staff.member.loginSecurity")} expanded={expanded.has("login")} onToggle={() => toggle("login")}>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.member.field.pinCode")}</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    type={pinVisible ? "text" : "password"}
                    value={pinCode}
                    onChange={(ev) => setPinCode(ev.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setPinVisible((v) => !v)}
                    aria-label={t("staff.member.field.pinCode")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
                  >
                    {pinVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPinCode(String(1000 + Math.floor(Math.random() * 9000)))}
                  className="mt-1.5 text-[11.5px] font-medium text-[#0D6EFD] hover:underline"
                >
                  {t("staff.member.field.resetPinCode")}
                </button>
              </div>

              <label className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("staff.member.field.twoFactor")}</span>
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(ev) => setTwoFactorEnabled(ev.target.checked)}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[var(--octo-track)] transition-colors checked:bg-[#0D6EFD]"
                />
              </label>
              {twoFactorEnabled && (
                <Select label={t("staff.member.field.preferred2fa")} defaultValue={profile.twoFactorMethod}>
                  <option value={profile.twoFactorMethod}>{profile.twoFactorMethod}</option>
                </Select>
              )}
            </div>
          </Section>

          <Section icon={<Lock size={15} />} title={t("staff.member.accessControls")} expanded={expanded.has("controls")} onToggle={() => toggle("controls")}>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-[var(--octo-text-primary)]">{t("staff.member.field.allowSystemLogin")}</span>
                <input
                  type="checkbox"
                  checked={allowSystemLogin}
                  onChange={(ev) => setAllowSystemLogin(ev.target.checked)}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[var(--octo-track)] transition-colors checked:bg-[#0D6EFD]"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-[var(--octo-text-primary)]">{t("staff.member.field.allowAccessOutsideBranch")}</span>
                <input
                  type="checkbox"
                  checked={allowOutsideBranch}
                  onChange={(ev) => setAllowOutsideBranch(ev.target.checked)}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[var(--octo-track)] transition-colors checked:bg-[#0D6EFD]"
                />
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-[var(--octo-text-primary)]">{t("staff.member.field.lockAccountPrompt")}</span>
                <Button variant="danger" size="sm" onClick={() => setLocked(true)}>
                  {t("staff.member.field.lockAccount")}
                </Button>
              </div>
            </div>
          </Section>
        </div>

        <SummaryCard profile={profile} deactivated={deactivated} />
      </div>
    </div>
  );
}
