import { useState } from "react";
import { FileDown, FileWarning, ReceiptText, ScrollText } from "lucide-react";
import { ReportShell } from "../_shared/report-shell";
import { DonutCard } from "../_shared/donut";
import { ChartCard } from "../_shared/chart-card";
import { downloadCsv } from "../_shared/export";
import { buildKpi } from "../_shared/kpi";
import { formatSAR, formatCount } from "../_shared/format";
import { Button, Modal } from "@ui/primitives";
import {
  complianceKpiBase,
  submissionSummary,
  vatDonut,
  vatSummary,
  vatSummaryTotal,
  invoiceExceptions,
  type ReportRange,
} from "@/shared/api/mock-reports";
import { useI18n } from "@/app/providers/i18n-provider";

const EXCEPTION_STATUS_COLORS: Record<string, string> = {
  rejected: "#ef4444",
  warning: "#b45309",
};

export function CompliancePage() {
  const { t } = useI18n();
  const [range, setRange] = useState<ReportRange>("30d");
  const [exportOpen, setExportOpen] = useState(false);
  const base = complianceKpiBase;

  const kpiCards = [
    buildKpi("compliance-issued", "reports.compliance.kpi.issued", formatCount(base.issued), "+8.2%", "violet"),
    buildKpi("compliance-cleared", "reports.compliance.kpi.clearedPct", `${base.clearedPct.toFixed(1)}%`, "+0.4%", "green"),
    buildKpi("compliance-reported", "reports.compliance.kpi.reportedPct", `${base.reportedPct.toFixed(1)}%`, "+0.1%", "blue"),
    buildKpi("compliance-rejected", "reports.compliance.kpi.rejected", formatCount(base.rejected), "-3", "orange", "#ef4444"),
    buildKpi("compliance-vatCollected", "reports.compliance.kpi.vatCollected", formatSAR(base.vatCollected), "+6.4%", "cyan"),
    buildKpi("compliance-vatPayable", "reports.compliance.kpi.vatPayable", formatSAR(base.vatPayable), "+5.1%", "orange"),
  ];

  const exportAudit = () =>
    downloadCsv(
      "zatca-invoice-exceptions.csv",
      [
        t("reports.compliance.col.invoice"),
        t("reports.compliance.col.date"),
        t("reports.compliance.col.type"),
        t("reports.compliance.col.amount"),
        t("reports.compliance.col.reason"),
        t("reports.compliance.col.status"),
      ],
      invoiceExceptions.map((row) => [
        row.id,
        row.date,
        t(row.typeKey),
        row.amount,
        t(row.reasonKey),
        t(`status.${row.status}`),
      ])
    );

  const maxVat = Math.max(base.vatCollected, base.vatPayable);

  const exportPayload = {
    submissionDays: submissionSummary.length,
    vatLines: vatSummary.length,
    exceptions: invoiceExceptions.length,
    rejected: invoiceExceptions.filter((row) => row.status === "rejected").length,
  };

  return (
    <ReportShell
      title={t("reports.compliance.title")}
      subtitle={t("reports.compliance.subtitle")}
      kpiCards={kpiCards}
      dateRange={range}
      onDateRangeChange={setRange}
      onExport={() => setExportOpen(true)}
      exportLabel={t("reports.compliance.exportAudit")}
      exportVariant="primary"
    >
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <SubmissionTable />
        <VatSummaryTable />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <DonutCard
          title={t("reports.compliance.vat.title")}
          icon={<ReceiptText size={15} />}
          caption={t(vatDonut.captionKey)}
          total={vatDonut.total}
          items={vatDonut.items}
        />
        <ChartCard title={t("reports.compliance.vat.obligation")} icon={<ScrollText size={15} />}>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <VatBar
              label={t("reports.compliance.vat.collected")}
              value={formatSAR(base.vatCollected)}
              color="#2ec9c0"
              ratio={base.vatCollected / maxVat}
            />
            <VatBar
              label={t("reports.compliance.vat.payable")}
              value={formatSAR(base.vatPayable)}
              color="#8b7cf0"
              ratio={base.vatPayable / maxVat}
            />
          </div>
        </ChartCard>
      </div>

      <ExceptionsTable exportAudit={exportAudit} />

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={t("reports.compliance.exportModal.title")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setExportOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              icon={<FileDown size={13} />}
              onClick={() => {
                exportAudit();
                setExportOpen(false);
              }}
            >
              {t("reports.compliance.exportModal.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("reports.compliance.exportModal.body")}</p>

        <ul className="mt-4 space-y-2.5">
          <ExportRow
            label={t("reports.compliance.submission.title")}
            value={t("reports.compliance.exportModal.days").replace("{n}", String(exportPayload.submissionDays))}
          />
          <ExportRow
            label={t("reports.compliance.vat.summary")}
            value={t("reports.compliance.exportModal.vatLines").replace("{n}", String(exportPayload.vatLines))}
          />
          <ExportRow
            label={t("reports.compliance.exceptions.title")}
            value={t("reports.compliance.exportModal.exceptions")
              .replace("{all}", String(exportPayload.exceptions))
              .replace("{rejected}", String(exportPayload.rejected))}
          />
          <ExportRow label={t("reports.compliance.exportModal.format")} value="CSV" />
        </ul>
      </Modal>
    </ReportShell>
  );
}

function ExportRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-[var(--octo-border-card)] bg-[var(--octo-row-hover)] px-3 py-2">
      <span className="text-[12px] text-[var(--octo-text-primary)]">{label}</span>
      <span className="text-end text-[12px] font-medium text-[var(--octo-text-secondary)]">{value}</span>
    </li>
  );
}

/* -------------------------------------------------- card — daily submissions */

function SubmissionTable() {
  const { t } = useI18n();
  return (
    <ChartCard title={t("reports.compliance.submission.title")} icon={<ReceiptText size={15} />}>
      <div className="octo-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              {[
                "reports.compliance.col.day",
                "reports.compliance.col.issued",
                "reports.compliance.col.cleared",
                "reports.compliance.col.pending",
                "reports.compliance.col.reported",
                "reports.compliance.col.rejected",
              ].map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissionSummary.map((row) => (
              <tr key={row.date} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.date}</td>
                <td className="whitespace-nowrap px-2 py-2.5">{formatCount(row.issued)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[#16a34a]">{formatCount(row.cleared)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[#b45309]">{formatCount(row.pending)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[#2563eb]">{formatCount(row.reported)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[#ef4444]">{formatCount(row.rejected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------- card — VAT summary table */

function VatSummaryTable() {
  const { t } = useI18n();
  return (
    <ChartCard title={t("reports.compliance.vat.summary")} icon={<ReceiptText size={15} />}>
      <div className="octo-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              {[
                "reports.compliance.vat.type",
                "reports.compliance.vat.net",
                "reports.compliance.vat.vat",
                "reports.compliance.vat.total",
              ].map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vatSummary.map((row) => (
              <tr key={row.typeKey} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{t(row.typeKey)}</td>
                <td className="whitespace-nowrap px-2 py-2.5">{formatSAR(row.net)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.vat)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{formatSAR(row.total)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-[var(--octo-border-card)]">
              <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">
                {t("reports.compliance.vat.grandTotal")}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5">{formatSAR(vatSummaryTotal.net)}</td>
              <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{formatSAR(vatSummaryTotal.vat)}</td>
              <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{formatSAR(vatSummaryTotal.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/* --------------------------------------------------------- mini VAT bar */

function VatBar({ label, value, color, ratio }: { label: string; value: string; color: string; ratio: number }) {
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</p>
      <p className="mt-1 text-[22px] font-bold leading-none text-[var(--octo-text-primary)]">{value}</p>
      <div className="mt-3 h-[6px] w-full overflow-hidden rounded-full bg-[var(--octo-track)]">
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------- card — invoice exceptions */

function ExceptionsTable({ exportAudit }: { exportAudit: () => void }) {
  const { t } = useI18n();
  return (
    <ChartCard
      title={t("reports.compliance.exceptions.title")}
      icon={<FileWarning size={15} />}
      className="mt-3 overflow-hidden"
      action={
        <button
          type="button"
          onClick={exportAudit}
          className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-[5px] text-[11.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          {t("reports.export")}
        </button>
      }
    >
      <div className="octo-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              {[
                "reports.compliance.col.invoice",
                "reports.compliance.col.date",
                "reports.compliance.col.type",
                "reports.compliance.col.amount",
                "reports.compliance.col.reason",
                "reports.compliance.col.status",
              ].map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoiceExceptions.map((row) => (
              <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.id}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.date}</td>
                <td className="whitespace-nowrap px-2 py-2.5">{t(row.typeKey)}</td>
                <td className="whitespace-nowrap px-2 py-2.5">{formatSAR(row.amount)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(row.reasonKey)}</td>
                <td className="whitespace-nowrap px-2 py-2.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${EXCEPTION_STATUS_COLORS[row.status] ?? "#8b8b93"}18`,
                      color: EXCEPTION_STATUS_COLORS[row.status] ?? "#6b6b74",
                    }}
                  >
                    {t(`status.${row.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
