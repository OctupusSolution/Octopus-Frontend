// "Table QR Codes": every table's code at a glance on the restaurant's own
// published plan (Figma 2012:185145), a modal per table, and the Generate flow.
// The codes are the backend's place codes (Menu module, US-020).
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { TEXT_PRIMARY, TEXT_SECONDARY } from "../../_shared/theme";
import { FloorPlanHub } from "../_shared/floor-plan-hub";
import { PageShell } from "../_shared/page-header";
import { ToastBanner, useToast } from "../_shared/toast";
import { useFloorPlan } from "../_shared/use-floor-plan";
import { AttentionPanel } from "./attention-panel";
import { GenerateFlow } from "./generate";
import { formatDate, useZoneDimmed, ZoneSelect } from "./parts";
import { exportCodes, printCodes } from "./print-codes";
import { PrintHistoryModal } from "./print-history-modal";
import { QrLegend, QrPlan } from "./qr-plan";
import { QR_STATUSES, type QrStatus } from "./qr-store";
import { RelinkModal } from "./relink-modal";
import { TableQrModal } from "./table-qr-modal";
import { BTN_OUTLINE, BTN_PRIMARY, QR_CARD, TEXT_SUBTEXT } from "./theme";
import { usePlaceCodes, type PlaceCodesState } from "./use-place-codes";
import { usePrintDesign } from "./use-print-design";

export function TableQrPage() {
  const { published } = useFloorPlan();
  return published ? <TableQrCodes doc={published.doc} /> : <FloorPlanHub />;
}

/** Loading, add-on missing, no permission, no published floor, or a failed read. */
function PhaseScreen({ pc }: { pc: PlaceCodesState }) {
  const { t } = useI18n();
  return (
    <PageShell>
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex max-w-[420px] flex-col items-center gap-3 text-center" role={pc.phase === "loading" ? "status" : undefined}>
          <h1 className={clsx("text-[20px] font-semibold leading-[1.2]", TEXT_PRIMARY)}>{t(`floorPlan.qr.phase.${pc.phase}.title`)}</h1>
          <p className={clsx("text-[14px] leading-[1.5]", TEXT_SECONDARY)}>{t(`floorPlan.qr.phase.${pc.phase}.body`)}</p>
          {pc.phase === "failed" && (
            <button type="button" onClick={() => void pc.refresh()} className={BTN_PRIMARY}>
              {t("floorPlan.qr.retry")}
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function TableQrCodes({ doc }: { doc: FloorPlanDoc }) {
  const { t, locale } = useI18n();
  const { toast, notify } = useToast();
  const pc = usePlaceCodes(doc, notify);
  const printDesign = usePrintDesign(pc.businessId);
  const [mode, setMode] = useState<"overview" | "generate">("overview");
  const [preselect, setPreselect] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [relink, setRelink] = useState<{ codeId: string; revision?: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const dimmed = useZoneDimmed(doc, zoneId);

  const tables = useMemo(() => doc.tables.filter((tb) => tb.visible), [doc.tables]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(QR_STATUSES.map((s) => [s, 0])) as Record<QrStatus, number>;
    for (const tb of tables) c[pc.statusOf(tb)] += 1;
    return c;
  }, [tables, pc.statusOf]);
  const hiddenIds = useMemo(
    () => new Set([...pc.rows].filter(([, r]) => r.hiddenFromCustomers).map(([id]) => id)),
    [pc.rows]
  );
  const lastPrinted = pc.lastPrint ? Date.parse(pc.lastPrint.printedAtUtc) : null;
  const printable = tables.filter((tb) => {
    const s = pc.statusOf(tb);
    return s === "active" || s === "reprint";
  });
  const open = openId ? tables.find((tb) => tb.id === openId) ?? null : null;

  if (pc.phase !== "ready") return <PhaseScreen pc={pc} />;

  function startGenerate(ids: string[] = []) {
    setPreselect(ids);
    setOpenId(null);
    setMode("generate");
  }
  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }
  const print = (list: FloorTable[]) => withBusy(() => printCodes(pc, doc, list, printDesign.design, t, notify));
  const download = (list: FloorTable[]) => withBusy(() => exportCodes(pc, list, t, notify));

  if (mode === "generate") {
    return (
      <GenerateFlow
        doc={doc}
        pc={pc}
        printDesign={printDesign}
        preselect={preselect}
        notify={notify}
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
          <button type="button" disabled={printable.length === 0 || busy} onClick={() => void print(printable)} className={BTN_OUTLINE}>
            <ShellIcon name="fp-qr-print.svg" size={24} />
            {t("floorPlan.qr.printAll")}
          </button>
          <button type="button" disabled={printable.length === 0 || busy} onClick={() => void download(printable)} className={BTN_OUTLINE}>
            <ShellIcon name="fp-qr-download.svg" size={24} />
            {t("floorPlan.qr.downloadAll")}
          </button>
          <button type="button" onClick={() => setHistoryOpen(true)} className={BTN_OUTLINE}>
            <ShellIcon name="fp-qr-timer-alt.svg" size={24} />
            {t("floorPlan.qr.history.open")}
          </button>
        </div>
        <AttentionPanel pc={pc} notify={notify} onRelink={(codeId, revision) => setRelink({ codeId, revision })} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <ZoneSelect doc={doc} value={zoneId} onChange={setZoneId} />
          <div className="lg:flex-1">
            <QrLegend counts={counts} />
          </div>
        </div>
        <QrPlan
          doc={doc}
          statusOf={pc.statusOf}
          dimmedIds={dimmed}
          hiddenIds={hiddenIds}
          selectedIds={openId ? new Set([openId]) : undefined}
          onTable={(tb) => setOpenId(tb.id)}
          className="h-[calc(100vh-200px)] min-h-[420px]"
        />
      </div>

      <TableQrModal
        doc={doc}
        table={open}
        pc={pc}
        design={printDesign.design}
        notify={notify}
        onClose={() => setOpenId(null)}
        onGenerate={() => open && startGenerate([open.id])}
        onRelink={(codeId) => {
          setRelink({ codeId, revision: open ? pc.rows.get(open.id)?.revision ?? undefined : undefined });
          setOpenId(null);
        }}
      />
      {historyOpen && <PrintHistoryModal pc={pc} notify={notify} onClose={() => setHistoryOpen(false)} />}
      {relink && <RelinkModal doc={doc} pc={pc} codeId={relink.codeId} revision={relink.revision} notify={notify} onClose={() => setRelink(null)} />}
      <ToastBanner toast={toast} />
    </PageShell>
  );
}
