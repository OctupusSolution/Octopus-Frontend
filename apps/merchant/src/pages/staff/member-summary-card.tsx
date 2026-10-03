import type { ReactNode } from "react";
import clsx from "clsx";
import type { MemberProfile } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "./_shared/avatar";
import { formatDate, formatDateTime } from "./_shared/format";
import { StaffIcon } from "./_shared/icon";
import { useStaffLabels } from "./_shared/labels";
import { useCatalogNames } from "./_shared/catalog-names";
import { StatusPill } from "./_shared/status-pill";
import { INK, INK_LINK, INK_SOFT, LINE } from "./_shared/theme";

export type MemberStatus = "active" | "inactive" | "locked";

const STATUS_TONE = { active: "success", inactive: "neutral", locked: "danger" } as const;

function Row({ icon, label, children, ltr }: { icon: string; label: string; children: ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={clsx("flex shrink-0 items-center gap-0.5 text-[10px] font-medium leading-[10px]", INK_SOFT)}>
        <StaffIcon name={icon} size={16} />
        {label}
      </dt>
      <dd dir={ltr ? "ltr" : undefined} className={clsx("-my-0.5 min-w-0 truncate py-0.5 text-end text-[12px] font-medium leading-3", INK)}>
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
    <aside className={clsx("flex flex-col gap-4 rounded-[16px] border bg-[var(--octo-card)] p-3", LINE, className)}>
      <div className={clsx("flex items-start gap-2 border-b pb-2", LINE)}>
        <Avatar name={e.name} size={48} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <div className="flex w-full min-w-0 flex-col gap-1">
            <p className={clsx("-my-0.5 truncate py-0.5 text-[14px] font-semibold leading-[14px]", INK)}>{e.name}</p>
            <p className={clsx("-my-0.5 truncate py-0.5 text-[12px] font-medium leading-3", INK_LINK)}>{names.jobTitle(profile.jobTitle)}</p>
          </div>
          <StatusPill tone={STATUS_TONE[status]} label={t(`staff.status.${status}`)} />
        </div>
      </div>

      <dl className="flex flex-col gap-3">
        <Row icon="staff-id-badge.svg" label={t("staff.member.field.employeeId")}>{profile.employeeCode}</Row>
        <Row icon="staff-call.svg" label={t("staff.member.field.phone")} ltr>{e.phone}</Row>
        <Row icon="staff-sms.svg" label={t("staff.member.field.email")} ltr>
          <span title={profile.email}>{profile.email || "—"}</span>
        </Row>
        <Row icon="staff-location.svg" label={t("staff.member.field.branch")}>{e.branch}</Row>
        <Row icon="staff-calendar-tick.svg" label={t("staff.member.field.joined")}>{formatDate(e.hireDate, locale)}</Row>
        <Row icon="staff-calendar-16.svg" label={t("staff.member.field.dateOfBirth")}>{formatDate(profile.dateOfBirth, locale)}</Row>
        <Row icon="staff-flag.svg" label={t("staff.member.field.nationality")}>{labels.data("staff.nationality", profile.nationality) || "—"}</Row>
        <Row icon="staff-language.svg" label={t("staff.member.field.language")}>{labels.data("staff.language", profile.languages)}</Row>
      </dl>

      {showSessions && profile.lastAccess && (
        <div className="flex flex-col gap-2 rounded-[12px] bg-[#dcffef] p-2 [[data-theme=dark]_&]:bg-[#009a39]/20">
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(0,154,57,0.2)] pb-1">
            <span className={clsx("text-[12px] font-bold leading-3", INK)}>{t("staff.member.field.activeSessions")}</span>
            {profile.locked ? (
              <StatusPill tone="neutral" label={t("staff.member.signedOut")} className="bg-white [[data-theme=dark]_&]:bg-[var(--octo-card)]" />
            ) : (
              <StatusPill tone="success" label={t("staff.status.active")} className="bg-white [[data-theme=dark]_&]:bg-[var(--octo-card)]" />
            )}
          </div>
          <div className="flex flex-col gap-1 text-[12px] font-medium leading-3">
            <p className={clsx("flex items-center gap-1", INK)}>
              <StaffIcon name="staff-ipad.svg" size={16} />
              {labels.data("staff.device", profile.activeSection.device)}
            </p>
            <p className={INK_SOFT}>{profile.activeSection.location}</p>
            <p className={INK_SOFT}>{formatDateTime(profile.activeSection.since, locale)}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
