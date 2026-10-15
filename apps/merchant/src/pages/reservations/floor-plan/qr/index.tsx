// "Table QR Codes": every table's code at a glance on the restaurant's own
// published plan (Figma 2012:185145), a modal per table, and the Generate flow.
import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { TEXT_PRIMARY, TEXT_SECONDARY } from "../../_shared/theme";
import { FloorPlanHub } from "../_shared/floor-plan-hub";
import { PageShell } from "../_shared/page-header";
import { ToastBanner, useToast } from "../_shared/toast";
import { useFloorPlan } from "../_shared/use-floor-plan";
import { GenerateFlow } from "./generate";
import { formatDate, useZoneDimmed, ZoneSelect } from "./parts";
import { DEFAULT_DESIGN, printTents } from "./print";
import { QrLegend, QrPlan } from "./qr-plan";
import { QR_STATUSES, downloadFile, qrSvgMarkup, statusOf, useTableQr, type QrStatus } from "./qr-store";
import { TableQrModal } from "./table-qr-modal";
import { BTN_OUTLINE, BTN_PRIMARY, QR_CARD, TEXT_SUBTEXT } from "./theme";

export function TableQrPage() {
  const { published } = useFloorPlan();
  return published ? <TableQrCodes doc={published.doc} /> : <FloorPlanHub />;
}

function TableQrCodes({ doc }: { doc: FloorPlanDoc }) {
  const { t, locale } = useI18n();
  const { toast, notify } = useToast();
  const qr = useTableQr();
  const [mode, setMode] = useState<"overview" | "generate">("overview");
  const [preselect, setPreselect] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const dimmed = useZoneDimmed(doc, zoneId);

  const tables = useMemo(() => doc.tables.filter((tb) => tb.visible), [doc.tables]);
  const tableStatus = useCallback((table: FloorTable): QrStatus => statusOf(qr.record[table.id]), [qr.record]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(QR_STATUSES.map((s) => [s, 0])) as Record<QrStatus, number>;
    for (const tb of tables) c[tableStatus(tb)] += 1;
    return c;
  }, [tables, tableStatus]);
  const lastPrinted = useMemo(
    () => Math.max(0, ...tables.map((tb) => qr.record[tb.id]?.lastPrintedAt ?? 0)) || null,
    [tables, qr.record]
  );
  const printable = tables.filter((tb) => qr.record[tb.id] && !qr.record[tb.id].disabled);
  const open = openId ? tables.find((tb) => tb.id === openId) ?? null : null;

  function startGenerate(ids: string[] = []) {
    setPreselect(ids);
    setOpenId(null);
    setMode("generate");
  }
  function print(list: FloorTable[]) {
    if (list.length === 0) return;
    printTents(doc, list.map((tb) => ({ table: tb, code: qr.record[tb.id].code })), DEFAULT_DESIGN, t);
    qr.markPrinted(list.map((tb) => tb.id));
  }
  function download(list: FloorTable[]) {
    list.forEach((tb, i) => setTimeout(() => downloadFile(`table-${tb.number}-qr.svg`, qrSvgMarkup(qr.record[tb.id].code)), i * 150));
  }

  if (mode === "generate") {
    return (
      <GenerateFlow
        doc={doc}
        qr={qr}
        preselect={preselect}
        onExit={(message) => {
          setMode("overview");
          if (message) notify(message);
        }}
      />
    );
  }

  const cards = [
    { tone: QR_CARD.blue, icon: "fp-qr-people.svg", value: String(tables.length), label: t("floorPlan.qr.card.total") },
    { tone: QR_CARD.green, icon: "fp-hub-check.svg", value: String(counts.active), label: t("floorPlan.qr.card.active") },
    { tone: QR_CARD.amber, icon: "fp-qr-timer-alt.svg", value: String(counts.notGenerated), label: t("floorPlan.qr.card.notGenerated") },
    { tone: QR_CARD.red, icon: "fp-qr-timer.svg", value: String(counts.reprint), label: t("floorPlan.qr.card.reprint") },
    { tone: QR_CARD.gray, icon: "fp-qr-timer-alt.svg", value: formatDate(lastPrinted, locale), label: t("floorPlan.qr.card.lastPrinted") },
  ];

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className={clsx("text-[24px] font-bold leading-[24px]", TEXT_PRIMARY)}>{t("floorPlan.qr.title")}</h1>
          <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SECONDARY)}>{t("floorPlan.qr.subtitle")}</p>
        </header>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-5">
          {cards.map((c) => (
            <article
              key={c.label}
              className={clsx("flex flex-col gap-4 rounded-[12px] border-2 border-[#fefefe] px-4 py-4 drop-shadow-[0px_4px_2.5px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border-[var(--octo-border-card)]", c.tone.card)}
            >
              <span className={clsx("grid h-12 w-12 place-items-center rounded-[12px] p-1.5 text-white", c.tone.icon)}>
                <ShellIcon name={c.icon} size={32} />
              </span>
              <span className="flex flex-col gap-2">
                <span className={clsx("truncate text-[24px] font-semibold leading-[24px]", TEXT_PRIMARY)} dir="auto">{c.value}</span>
                <span className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SUBTEXT)}>{c.label}</span>
              </span>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => startGenerate()} className={BTN_PRIMARY}>
            <ShellIcon name="fp-qr-generate.svg" size={24} />
            {t("floorPlan.qr.generate")}
          </button>
          <button type="button" disabled={printable.length === 0} onClick={() => print(printable)} className={BTN_OUTLINE}>
            <ShellIcon name="fp-qr-print.svg" size={24} />
            {t("floorPlan.qr.printAll")}
          </button>
          <button type="button" disabled={printable.length === 0} onClick={() => download(printable)} className={BTN_OUTLINE}>
            <ShellIcon name="fp-qr-download.svg" size={24} />
            {t("floorPlan.qr.downloadAll")}
          </button>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <ZoneSelect doc={doc} value={zoneId} onChange={setZoneId} />
          <div className="lg:flex-1">
            <QrLegend counts={counts} />
          </div>
        </div>
        <QrPlan
          doc={doc}
          statusOf={tableStatus}
          dimmedIds={dimmed}
          selectedIds={openId ? new Set([openId]) : undefined}
          onTable={(tb) => setOpenId(tb.id)}
          className="h-[calc(100vh-200px)] min-h-[420px]"
        />
      </div>

      <TableQrModal
        doc={doc}
        table={open}
        qr={open ? qr.record[open.id] : undefined}
        onClose={() => setOpenId(null)}
        onGenerate={() => open && startGenerate([open.id])}
        onPrint={() => open && print([open])}
        onDownload={() => open && download([open])}
        onToggleDisabled={() => {
          if (!open) return;
          const disabled = !qr.record[open.id]?.disabled;
          qr.setDisabled(open.id, disabled);
          notify(t(disabled ? "floorPlan.qr.disabledDone" : "floorPlan.qr.enabledDone").replace("{number}", open.number), disabled ? "info" : undefined);
        }}
        onRegenerate={() => {
          if (!open) return;
          qr.generate([open], true);
          notify(t("floorPlan.qr.regeneratedDone").replace("{number}", open.number));
        }}
      />
      <ToastBanner toast={toast} />
    </PageShell>
  );
}
