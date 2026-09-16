import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { TODAY } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { formatAuditTime } from "./_shared/format";
import { useStaffStore, type AuditEntry } from "./_shared/staff-store";

const PREVIEW = 5;

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
  const { t } = useI18n();
  const store = useStaffStore();
  const [fullOpen, setFullOpen] = useState(false);
  const entries = store.auditOf(employeeId);

  return (
    <aside aria-label={t("staff.audit.title")} className={clsx("rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4", className)}>
      <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("staff.audit.title")}</h2>
      <div className="mt-4">
        {entries.length ? (
          <Timeline entries={entries.slice(0, PREVIEW)} />
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
          {entries.length ? <Timeline entries={entries} /> : <p className="text-[14px] text-[var(--octo-text-secondary)]">{t("staff.audit.empty")}</p>}
        </div>
      </Modal>
    </aside>
  );
}
