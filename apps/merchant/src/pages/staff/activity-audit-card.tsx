import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { listStaffMemberActivity, type StaffActivityResponse } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { TODAY } from "@/shared/api/mock-staff";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { formatAuditTime } from "./_shared/format";
import { useStaffStore, type AuditEntry } from "./_shared/staff-store";

const PREVIEW = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The server's own action vocabulary isn't documented, so it's shown as-is
 *  (spaced out) rather than forced into the local AuditEntry `kind`s, which
 *  were named for the mock fixture's events, not the real audit log. */
function humanizeAction(action: string): string {
  return action.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
}

function ServerTimeline({ entries, locale }: { entries: StaffActivityResponse[]; locale: string }) {
  const { t } = useI18n();
  const words = { today: t("staff.audit.today"), yesterday: t("staff.audit.yesterday") };
  return (
    <ol className="flex flex-col">
      {entries.map((entry, i) => (
        <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < entries.length - 1 && <span aria-hidden className="absolute start-[5px] top-4 h-full w-px bg-[var(--octo-divider)]" />}
          <span aria-hidden className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full bg-[#16A34A]" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold capitalize text-[var(--octo-text-primary)]">{humanizeAction(entry.action)}</p>
            <p className="text-[13px] text-[var(--octo-text-secondary)]">{formatAuditTime(entry.occurredAtUtc, locale, TODAY, words)}</p>
            {entry.actorDisplay && <p className="truncate text-[13px] text-[var(--octo-text-secondary)]">{t("staff.audit.by").replace("{name}", entry.actorDisplay)}</p>}
          </div>
        </li>
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
          <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < entries.length - 1 && <span aria-hidden className="absolute start-[5px] top-4 h-full w-px bg-[var(--octo-divider)]" />}
            <span aria-hidden className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full bg-[#16A34A]" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t(`staff.audit.kind.${entry.kind}`)}</p>
              <p className="text-[13px] text-[var(--octo-text-secondary)]">{formatAuditTime(entry.at, locale, TODAY, words)}</p>
              {detail && (
                <p className="truncate text-[13px] text-[var(--octo-text-secondary)]" dir={entry.ip ? "ltr" : undefined}>
                  {detail}
                </p>
              )}
            </div>
          </li>
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

  return (
    <aside aria-label={t("staff.audit.title")} className={clsx("rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4", className)}>
      <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("staff.audit.title")}</h2>
      <div className="mt-4">
        {entries.length ? (
          useServer ? (
            <ServerTimeline entries={serverEntries.slice(0, PREVIEW)} locale={locale} />
          ) : (
            <Timeline entries={localEntries.slice(0, PREVIEW)} />
          )
        ) : (
          <p className="text-[14px] text-[var(--octo-text-secondary)]">{t("staff.audit.empty")}</p>
        )}
      </div>

      <button type="button" onClick={() => setFullOpen(true)} className={buttonClass("outline", "md", "mt-5 w-full")}>
        {t("staff.audit.viewAll")}
      </button>

      <div className="mt-4 rounded-[10px] bg-[var(--octo-tone-warning-bg)] p-3 text-[var(--octo-tone-warning-text)]">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold">
          <TriangleAlert size={16} aria-hidden />
          {t("staff.audit.importantTitle")}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed">{t("staff.audit.importantBody")}</p>
      </div>

      <Modal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        title={t("staff.audit.fullTitle").replace("{name}", name)}
        className="max-w-lg"
        footer={
          <button type="button" onClick={() => setFullOpen(false)} className={buttonClass("secondary")}>
            {t("staff.availability.close")}
          </button>
        }
      >
        <div className="octo-scroll mt-2 max-h-[60vh] overflow-y-auto pe-1">
          {entries.length ? (
            useServer ? <ServerTimeline entries={serverEntries} locale={locale} /> : <Timeline entries={localEntries} />
          ) : (
            <p className="text-[14px] text-[var(--octo-text-secondary)]">{t("staff.audit.empty")}</p>
          )}
        </div>
      </Modal>
    </aside>
  );
}
