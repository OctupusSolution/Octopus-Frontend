import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { listStaffMemberActivity, type StaffActivityResponse } from "@octopus/api-client";
import { TODAY } from "@/shared/api/mock-staff";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { formatAuditTime } from "./_shared/format";
import { StaffIcon } from "./_shared/icon";
import { StaffModal } from "./_shared/staff-modal";
import { useStaffStore, type AuditEntry } from "./_shared/staff-store";
import { INK, INK_SOFT, LINE } from "./_shared/theme";

const PREVIEW = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The server's own action vocabulary isn't documented, so it's shown as-is
 *  (spaced out) rather than forced into the local AuditEntry `kind`s, which
 *  were named for the mock fixture's events, not the real audit log. */
function humanizeAction(action: string): string {
  return action.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
}

// One timeline stop as the frame draws it: a 16px green dot in a 24px mint
// halo, a 12px title and 10px detail lines, with a mint rail running through
// the dots' centres down to the next stop.
function Stop({ title, lines, last, capitalize }: { title: string; lines: ReactNode[]; last: boolean; capitalize?: boolean }) {
  return (
    <li className="relative flex items-start gap-2 pb-8 last:pb-0">
      {!last && <span aria-hidden className="absolute bottom-0 start-[11.5px] top-3 w-px bg-[#bef2da] [[data-theme=dark]_&]:bg-[#009a39]/40" />}
      <span aria-hidden className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#dcffef] [[data-theme=dark]_&]:bg-[#009a39]/25">
        <span className="h-4 w-4 rounded-full bg-[#009a39]" />
      </span>
      <div className="flex min-w-0 flex-col gap-2 font-medium">
        <p className={clsx("truncate text-[12px] leading-3", INK, capitalize && "capitalize")}>{title}</p>
        <div className={clsx("flex flex-col gap-2 text-[10px] leading-[10px]", INK_SOFT)}>{lines}</div>
      </div>
    </li>
  );
}

function ServerTimeline({ entries, locale }: { entries: StaffActivityResponse[]; locale: string }) {
  const { t } = useI18n();
  const words = { today: t("staff.audit.today"), yesterday: t("staff.audit.yesterday") };
  return (
    <ol className="flex flex-col">
      {entries.map((entry, i) => (
        <Stop
          key={entry.id}
          capitalize
          last={i === entries.length - 1}
          title={humanizeAction(entry.action)}
          lines={[
            <p key="at">{formatAuditTime(entry.occurredAtUtc, locale, TODAY, words)}</p>,
            entry.actorDisplay && (
              <p key="by" className="truncate">
                {t("staff.audit.by").replace("{name}", entry.actorDisplay)}
              </p>
            ),
          ]}
        />
      ))}
    </ol>
  );
}

function Timeline({ entries }: { entries: AuditEntry[] }) {
  const { t, locale } = useI18n();
  const words = { today: t("staff.audit.today"), yesterday: t("staff.audit.yesterday") };

  return (
    <ol className="flex flex-col">
      {entries.map((entry, i) => {
        const detail = entry.device
          ? `${entry.device}${entry.ip ? ` ${entry.ip}` : ""}`
          : entry.actor
            ? t("staff.audit.by").replace("{name}", entry.actor)
            : null;
        return (
          <Stop
            key={entry.id}
            last={i === entries.length - 1}
            title={t(`staff.audit.kind.${entry.kind}`)}
            lines={[
              <p key="at">{formatAuditTime(entry.at, locale, TODAY, words)}</p>,
              detail && (
                <p key="detail" className="truncate" dir={entry.ip ? "ltr" : undefined}>
                  {detail}
                </p>
              ),
            ]}
          />
        );
      })}
    </ol>
  );
}

export function ActivityAuditCard({ employeeId, name, className }: { employeeId: string; name: string; className?: string }) {
  const { t, locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const store = useStaffStore();
  const [fullOpen, setFullOpen] = useState(false);
  const localEntries = store.auditOf(employeeId);

  // BACKEND_GAPS 6's audit card ran entirely on the mock fixture; the real
  // log (listStaffMemberActivity) was ready and never called. It only
  // replaces the local list for a real, server-backed employee.
  const [serverEntries, setServerEntries] = useState<StaffActivityResponse[] | null>(null);
  useEffect(() => {
    setServerEntries(null);
    if (!activeBusinessId || !UUID.test(employeeId)) return;
    let cancelled = false;
    listStaffMemberActivity(activeBusinessId, employeeId, { page: 1, pageSize: 100 })
      .then((res) => {
        if (!cancelled) setServerEntries(res.data);
      })
      .catch(() => {
        if (!cancelled) setServerEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, employeeId]);

  const useServer = serverEntries !== null && serverEntries.length > 0;
  const entries = useServer ? serverEntries : localEntries;
  const empty = <p className={clsx("text-[12px] font-medium leading-[1.4]", INK_SOFT)}>{t("staff.audit.empty")}</p>;

  return (
    <aside aria-label={t("staff.audit.title")} className={clsx("flex flex-col gap-4 rounded-[16px] border bg-[var(--octo-card)] p-3", LINE, className)}>
      <h2 className={clsx("text-[14px] font-bold leading-[14px]", INK)}>{t("staff.audit.title")}</h2>
      {entries.length ? (
        useServer ? (
          <ServerTimeline entries={serverEntries.slice(0, PREVIEW)} locale={locale} />
        ) : (
          <Timeline entries={localEntries.slice(0, PREVIEW)} />
        )
      ) : (
        empty
      )}

      <button type="button" onClick={() => setFullOpen(true)} className={buttonClass("outline", "md", "w-full")}>
        {t("staff.audit.viewAll")}
      </button>

      <div className="flex flex-col gap-2 rounded-[12px] bg-[#fff5e4] p-2 [[data-theme=dark]_&]:bg-[#f59e0b]/15">
        <p className="flex items-center gap-1 text-[12px] font-bold leading-3 text-[#f59e0b]">
          <StaffIcon name="staff-error-circle.svg" size={16} />
          {t("staff.audit.importantTitle")}
        </p>
        <p className={clsx("text-[12px] font-medium leading-[1.4]", INK_SOFT)}>{t("staff.audit.importantBody")}</p>
      </div>

      <StaffModal open={fullOpen} onClose={() => setFullOpen(false)} title={t("staff.audit.fullTitle").replace("{name}", name)}>
        {entries.length ? useServer ? <ServerTimeline entries={serverEntries} locale={locale} /> : <Timeline entries={localEntries} /> : empty}
      </StaffModal>
    </aside>
  );
}
