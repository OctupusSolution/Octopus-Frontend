import type { ReactNode } from "react";
import { CalendarDays, Flag, Globe, IdCard, Mail, MapPin, Phone, Tablet, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { MemberProfile } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "./_shared/avatar";
import { formatDate, formatDateTime } from "./_shared/format";
import { useStaffLabels } from "./_shared/labels";
import { useCatalogNames } from "./_shared/catalog-names";
import { StatusPill } from "./_shared/status-pill";

export type MemberStatus = "active" | "inactive" | "locked";

const STATUS_TONE = { active: "success", inactive: "neutral", locked: "danger" } as const;

function Row({ icon: Icon, label, children, ltr }: { icon: LucideIcon; label: string; children: ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--octo-text-secondary)]">
        <Icon size={16} strokeWidth={1.7} aria-hidden />
        {label}
      </dt>
      <dd dir={ltr ? "ltr" : undefined} className="min-w-0 truncate text-end text-[13px] text-[var(--octo-text-primary)]">
        {children}
      </dd>
    </div>
  );
}

export function MemberSummaryCard({
  profile,
  status,
  showSessions,
  className,
}: {
  profile: MemberProfile;
  status: MemberStatus;
  showSessions: boolean;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const names = useCatalogNames();
  const e = profile.employee;

  return (
    <aside className={clsx("rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4", className)}>
      <div className="flex items-start gap-3">
        <Avatar name={e.name} size={56} />
        <div className="min-w-0 pt-0.5">
          <p className="truncate text-[16px] font-semibold leading-snug text-[var(--octo-text-primary)]">{e.name}</p>
          <p className="truncate text-[13px] leading-snug text-[#0D6EFD]">{names.jobTitle(profile.jobTitle)}</p>
          <StatusPill className="mt-1.5" tone={STATUS_TONE[status]} label={t(`staff.status.${status}`)} />
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-3.5 border-t border-[var(--octo-divider)] pt-4">
        <Row icon={IdCard} label={t("staff.member.field.employeeId")}>{profile.employeeCode}</Row>
        <Row icon={Phone} label={t("staff.member.field.phone")} ltr>{e.phone}</Row>
        <Row icon={Mail} label={t("staff.member.field.email")} ltr>
          <span title={profile.email}>{profile.email || "—"}</span>
        </Row>
        <Row icon={MapPin} label={t("staff.member.field.branch")}>{e.branch}</Row>
        <Row icon={CalendarDays} label={t("staff.member.field.joined")}>{formatDate(e.hireDate, locale)}</Row>
        <Row icon={CalendarDays} label={t("staff.member.field.dateOfBirth")}>{formatDate(profile.dateOfBirth, locale)}</Row>
        <Row icon={Flag} label={t("staff.member.field.nationality")}>{labels.data("staff.nationality", profile.nationality) || "—"}</Row>
        <Row icon={Globe} label={t("staff.member.field.language")}>{labels.data("staff.language", profile.languages)}</Row>
      </dl>

      {showSessions && profile.lastAccess && (
        <div className="mt-4 rounded-[10px] bg-[var(--octo-tone-success-bg)] p-3">
          <div className="flex items-center justify-between gap-2 border-b border-[#16A34A]/20 pb-2">
            <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("staff.member.field.activeSessions")}</span>
            {profile.locked ? (
              <StatusPill tone="neutral" label={t("staff.member.signedOut")} />
            ) : (
              <StatusPill tone="success" label={t("staff.status.active")} />
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[var(--octo-text-primary)]">
            <Tablet size={16} strokeWidth={1.7} aria-hidden />
            {labels.data("staff.device", profile.activeSection.device)}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--octo-text-secondary)]">{profile.activeSection.location}</p>
          <p className="text-[12px] text-[var(--octo-text-secondary)]">{formatDateTime(profile.activeSection.since, locale)}</p>
        </div>
      )}
    </aside>
  );
}
