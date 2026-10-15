// "Generate QR Code": pick tables on the plan, design the printed card, then
// review and print (Figma 2012:186918, 2012:188670, 2012:190398).
import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { zoneForTable, type FloorPlanDoc, type FloorTable } from "@/entities/floor-plan";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { QrCode } from "../../../public-link/ui/qr-code";
import { BORDER_200, TEXT_PRIMARY, TEXT_SECONDARY } from "../../_shared/theme";
import { PageShell } from "../_shared/page-header";
import { Switch } from "../_shared/switch";
import { byNumber, DetailRow, formatDate, tableMeta, useZoneDimmed, ZoneSelect } from "./parts";
import { DEFAULT_DESIGN, QR_SIZE_PX, printTents, type QrDesign } from "./print";
import { QrLegend, QrPlan } from "./qr-plan";
import { QR_STATUSES, downloadFile, qrSvgMarkup, qrValue, statusOf, type QrStatus, type useTableQr } from "./qr-store";
import { BTN_MODAL_OUTLINE, BTN_MODAL_PRIMARY, BTN_MODAL_WARNING, QR_STATUS_TEXT } from "./theme";

type SelectMode = "individual" | "zone" | "range" | "all";
const SELECT_MODES: readonly SelectMode[] = ["individual", "zone", "range", "all"];
const STEPS = ["select", "design", "review"] as const;

const asset = (path: string) => new URL(`../../../../../../assets/Dashboard/${path}`, import.meta.url).href;

const TEXT_BRAND = "text-[#0d6efd] [[data-theme=dark]_&]:text-[var(--octo-accent)]";
const BORDER_300 = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";
const LABEL = clsx("text-[14px] font-medium leading-[14px]", TEXT_PRIMARY);

export function GenerateFlow({
  doc,
  qr,
  preselect,
  onExit,
}: {
  doc: FloorPlanDoc;
  qr: ReturnType<typeof useTableQr>;
  preselect: string[];
  onExit: (message?: string) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(preselect));
  const [design, setDesign] = useState<QrDesign>(DEFAULT_DESIGN);
  const tables = useMemo(() => doc.tables.filter((tb) => tb.visible).sort(byNumber), [doc.tables]);
  const chosen = tables.filter((tb) => selected.has(tb.id));

  // Selected tables draw as active on steps 2-3: that is what they become.
  const preview = (table: FloorTable): QrStatus =>
    step > 1 && selected.has(table.id) ? "active" : statusOf(qr.record[table.id]);

  function finish() {
    const record = qr.generate(chosen);
    const codes = chosen.map((tb) => ({ table: tb, code: record[tb.id]?.code }));
    const missing = codes.some((c) => !c.code);
    const items = missing ? null : (codes as { table: FloorTable; code: string }[]);
    if (items) {
      printTents(doc, items, design, t);
      qr.markPrinted(chosen.map((tb) => tb.id));
    }
    onExit(t("floorPlan.qr.generatedDone").replace("{n}", String(chosen.length)));
  }

  return (
    <PageShell>
      <header className="flex flex-col gap-3">
        <h1 className={clsx("text-[24px] font-bold leading-[24px]", TEXT_PRIMARY)}>{t("floorPlan.qr.generate")}</h1>
        <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SECONDARY)}>{t("floorPlan.qr.generateSubtitle")}</p>
      </header>
      <Stepper current={step} onJump={(n) => n < step && setStep(n)} />

      {step === 1 && (
        <SelectStep doc={doc} tables={tables} selected={selected} setSelected={setSelected} statusOf={preview} />
      )}
      {step === 2 && (
        <DesignStep doc={doc} tables={tables} selected={selected} setSelected={setSelected} statusOf={preview} design={design} setDesign={setDesign} qr={qr} chosen={chosen} />
      )}
      {step === 3 && <ReviewStep doc={doc} chosen={chosen} design={design} setDesign={setDesign} qr={qr} onEdit={() => setStep(1)} />}

      {step === 2 && (
        <div className="mt-6 flex items-center gap-2 rounded-t-[12px] bg-[#f0f4ff] px-3 py-3 text-[14px] font-medium text-[#0d6efd] [[data-theme=dark]_&]:bg-[var(--octo-selected)]">
          <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-current text-[11px] font-bold">!</span>
          {t("floorPlan.qr.generatingFor").replace("{n}", String(chosen.length))}
        </div>
      )}
      <div className={clsx("grid gap-4", step === 1 ? "mt-4 grid-cols-1" : "grid-cols-2", step === 2 ? "rounded-b-[12px] bg-[#f0f4ff] px-2 pb-2 [[data-theme=dark]_&]:bg-[var(--octo-selected)]" : step === 3 && "mt-6")}>
        {step > 1 ? (
          <button type="button" onClick={() => setStep(step - 1)} className={clsx(BTN_MODAL_OUTLINE, "border-[#0d6efd] bg-white [[data-theme=dark]_&]:bg-transparent")}>
            {t("floorPlan.common.previous")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={chosen.length === 0}
          onClick={() => (step < 3 ? setStep(step + 1) : finish())}
          className={BTN_MODAL_PRIMARY}
        >
          {step < 3 ? t("floorPlan.common.next") : t("floorPlan.qr.printAll")}
        </button>
      </div>
      {step === 1 && (
        <button type="button" onClick={() => onExit()} className={clsx("mt-3 w-full text-center text-[14px] font-medium", TEXT_SECONDARY)}>
          {t("floorPlan.common.cancel")}
        </button>
      )}
    </PageShell>
  );
}

function Stepper({ current, onJump }: { current: number; onJump: (n: number) => void }) {
  const { t } = useI18n();
  return (
    <ol className="relative mt-6 flex items-start justify-between">
      <li aria-hidden className="absolute end-[40px] start-[40px] top-[11px] h-1 rounded-full bg-[#e2e8f0] [[data-theme=dark]_&]:bg-[var(--octo-track)]" />
      <li
        aria-hidden
        className="absolute start-[40px] top-[11px] h-1 rounded-full bg-[#0d6efd] transition-all"
        style={{ width: `calc(${((current - 1) / (STEPS.length - 1)) * 100}% - ${((current - 1) / (STEPS.length - 1)) * 80}px)` }}
      />
      {STEPS.map((id, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={id} className={clsx("relative flex flex-col gap-2", i === 0 ? "items-start" : i === STEPS.length - 1 ? "items-end" : "items-center")}>
            <button
              type="button"
              onClick={() => onJump(n)}
              disabled={n >= current}
              className={clsx(
                "mx-6 grid h-6 w-6 place-items-center rounded-full border text-[12px] font-semibold leading-[12px]",
                done ? "border-[#0d6efd] bg-[#0d6efd] text-white" : active ? "border-[#0d6efd] bg-[#f5f9ff] text-[#0d6efd] [[data-theme=dark]_&]:bg-[var(--octo-selected)]" : clsx("bg-white [[data-theme=dark]_&]:bg-[var(--octo-card)]", BORDER_300, TEXT_SECONDARY)
              )}
            >
              {n}
            </button>
            <span className={clsx("whitespace-nowrap text-[14px] leading-[14px]", done || active ? TEXT_BRAND : "text-[#58606c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]")}>
              {t(`floorPlan.qr.step.${id}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type PlanPickerProps = {
  doc: FloorPlanDoc;
  tables: FloorTable[];
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  statusOf: (table: FloorTable) => QrStatus;
};

/** Selection modes, zone filter, legend and the plan (Figma 2012:186918). */
function PlanPicker({ doc, tables, selected, setSelected, statusOf, className }: PlanPickerProps & { className?: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<SelectMode>("individual");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState("");
  const dimmed = useZoneDimmed(doc, zoneId);
  const pickable = tables.filter((tb) => !dimmed.has(tb.id));

  const counts = useMemo(() => {
    const c = Object.fromEntries(QR_STATUSES.map((s) => [s, 0])) as Record<QrStatus, number>;
    for (const tb of tables) c[statusOf(tb)] += 1;
    return c;
  }, [tables, statusOf]);

  function pick(table: FloorTable) {
    const next = new Set(selected);
    if (mode === "zone") {
      const zone = zoneForTable(doc, table);
      const group = tables.filter((tb) => zoneForTable(doc, tb)?.id === zone?.id);
      const on = !selected.has(table.id);
      group.forEach((tb) => (on ? next.add(tb.id) : next.delete(tb.id)));
    } else if (mode === "range" && anchor && anchor !== table.id) {
      const a = tables.findIndex((tb) => tb.id === anchor);
      const b = tables.findIndex((tb) => tb.id === table.id);
      tables.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((tb) => next.add(tb.id));
      setAnchor(null);
    } else {
      if (mode === "range") setAnchor(table.id);
      if (next.has(table.id) && mode !== "range") next.delete(table.id);
      else next.add(table.id);
    }
    setSelected(next);
  }

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {SELECT_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setAnchor(null);
              if (m === "all") setSelected(new Set(pickable.map((tb) => tb.id)));
            }}
            className={clsx(
              "h-10 rounded-[8px] border px-3 text-[14px] font-medium leading-[14px] transition-colors",
              mode === m ? "border-[#0d6efd] bg-[#f5f9ff] text-[#0d6efd] [[data-theme=dark]_&]:bg-[var(--octo-selected)]" : clsx(BORDER_200, TEXT_PRIMARY, "bg-white [[data-theme=dark]_&]:bg-[var(--octo-card)]")
            )}
          >
            {t(`floorPlan.qr.select.${m}`)}
          </button>
        ))}
        {selected.size > 0 && (
          <button type="button" onClick={() => setSelected(new Set())} className={clsx("ms-auto text-[14px] font-medium", TEXT_BRAND)}>
            {t("floorPlan.qr.clearSelection").replace("{n}", String(selected.size))}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <ZoneSelect doc={doc} value={zoneId} onChange={setZoneId} />
        <div className="lg:flex-1">
          <QrLegend counts={counts} />
        </div>
      </div>
      <QrPlan
        doc={doc}
        statusOf={statusOf}
        selectedIds={selected}
        dimmedIds={dimmed}
        onTable={(tb) => !dimmed.has(tb.id) && pick(tb)}
        className="h-[calc(100vh-360px)] min-h-[420px]"
      />
    </div>
  );
}

function SelectStep(props: PlanPickerProps) {
  return <PlanPicker {...props} className="mt-8" />;
}

function DesignStep({
  design,
  setDesign,
  chosen,
  qr,
  doc,
  ...picker
}: PlanPickerProps & { design: QrDesign; setDesign: (d: QrDesign) => void; chosen: FloorTable[]; qr: ReturnType<typeof useTableQr> }) {
  const { t } = useI18n();
  const exportSvgs = () =>
    chosen.forEach((tb, i) =>
      setTimeout(() => downloadFile(`table-${tb.number}-qr.svg`, qrSvgMarkup(qr.record[tb.id]?.code ?? `QR-T${tb.number}`)), i * 150)
    );
  const exports = [
    { label: t("floorPlan.qr.export.pdf"), run: () => printTents(doc, chosen.map((tb) => ({ table: tb, code: qr.record[tb.id]?.code ?? `QR-T${tb.number}` })), design, t) },
    { label: t("floorPlan.qr.export.png"), run: exportSvgs },
    { label: t("floorPlan.qr.export.svg"), run: exportSvgs },
    { label: t("floorPlan.qr.export.zip"), run: exportSvgs },
  ];
  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {exports.map((e) => (
          <button
            key={e.label}
            type="button"
            disabled={chosen.length === 0}
            onClick={e.run}
            className={clsx("inline-flex h-10 items-center gap-2 rounded-[8px] border px-3 text-[16px] font-medium disabled:opacity-50", BORDER_300, TEXT_PRIMARY)}
          >
            <ShellIcon name="fp-qr-download.svg" size={24} />
            {e.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_269px]">
        <PlanPicker doc={doc} {...picker} />
        <DesignPanel design={design} setDesign={setDesign} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-3">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

function Select<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <span className={clsx("relative flex h-10 items-center rounded-[8px] border", BORDER_300)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={clsx("h-full w-full cursor-pointer appearance-none bg-transparent pe-10 ps-2 text-[14px] leading-[14px] outline-none", TEXT_PRIMARY)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ShellIcon name="fp-qr-arrow-down.svg" size={24} className={clsx("pointer-events-none absolute end-2", TEXT_PRIMARY)} />
    </span>
  );
}

const TEMPLATE_SPRITE: Record<Exclude<QrDesign["template"], "tent">, { box: string; img: string }> = {
  sticker: { box: "h-[31px] w-[31px]", img: "h-[292.31%] left-[-283.9%] top-[-76.92%] w-[867.8%]" },
  square: { box: "h-[31px] w-[33px]", img: "h-[282.64%] left-[-448.06%] top-[-73.55%] w-[793.8%]" },
  custom: { box: "h-[31px] w-[34px]", img: "h-[308.11%] left-[-667.48%] top-[-85.59%] w-[832.52%]" },
};

/** "QR Code Design & Template" (Figma 2012:190041). */
function DesignPanel({ design, setDesign }: { design: QrDesign; setDesign: (d: QrDesign) => void }) {
  const { t } = useI18n();
  const set = <K extends keyof QrDesign>(key: K, value: QrDesign[K]) => setDesign({ ...design, [key]: value });
  const section = clsx("flex w-full flex-col gap-3 border-b pb-2", BORDER_300);
  return (
    <aside className={clsx("flex h-fit flex-col gap-4 rounded-[20px] border px-2 py-3", BORDER_300)}>
      <h2 className={clsx("text-[16px] font-medium leading-[16px]", TEXT_PRIMARY)}>{t("floorPlan.qr.design.title")}</h2>
      <div className={section}>
        <span className={LABEL}>{t("floorPlan.qr.design.template")}</span>
        <div className="flex items-center justify-between">
          {(["tent", "sticker", "square", "custom"] as const).map((tpl) => (
            <button key={tpl} type="button" onClick={() => set("template", tpl)} className="flex w-[52px] flex-col items-center gap-1">
              <span className={clsx("flex h-12 w-full items-center justify-center rounded-[8px] border px-1 py-2", design.template === tpl ? "border-[#0d6efd]" : BORDER_300)}>
                {tpl === "tent" ? (
                  <img alt="" src={asset("icons/fp-qr-tent.svg")} className="h-[31px] w-[31px]" />
                ) : (
                  <span className={clsx("relative overflow-hidden", TEMPLATE_SPRITE[tpl].box)}>
                    <img alt="" src={asset("images/fp-qr-templates.png")} className={clsx("absolute max-w-none", TEMPLATE_SPRITE[tpl].img)} />
                  </span>
                )}
              </span>
              <span className={clsx("whitespace-nowrap text-center text-[10px] font-medium leading-[10px]", TEXT_PRIMARY)}>{t(`floorPlan.qr.template.${tpl}`)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={section}>
        <Field label={t("floorPlan.qr.design.tentSize")}>
          <Select value={design.tentSize} onChange={(v) => set("tentSize", v)} options={["60x90", "75x110", "100x150"].map((v) => ({ value: v, label: `${v.replace("x", "*")}mm` }))} />
        </Field>
        <Field label={t("floorPlan.qr.design.paper")}>
          <Select value={design.paper} onChange={(v) => set("paper", v)} options={(["A4", "A5", "Letter"] as const).map((v) => ({ value: v, label: v }))} />
        </Field>
        <Field label={t("floorPlan.qr.design.qrSize")}>
          <Select value={design.qrSize} onChange={(v) => set("qrSize", v)} options={(["small", "medium", "large"] as const).map((v) => ({ value: v, label: t(`floorPlan.qr.size.${v}`) }))} />
        </Field>
        <span className={LABEL}>{t("floorPlan.qr.design.margins")}</span>
        <div className="grid grid-cols-2 gap-3">
          {(["top", "bottom", "right", "left"] as const).map((side) => (
            <div key={side} className="flex flex-col gap-2">
              <span className={clsx("text-[12px] font-medium leading-[12px]", TEXT_PRIMARY)}>{t(`floorPlan.qr.margin.${side}`)}</span>
              <span className={clsx("flex h-10 items-center justify-between rounded-[8px] border p-2", BORDER_300)}>
                <button type="button" aria-label="-" onClick={() => set("margins", { ...design.margins, [side]: Math.max(0, design.margins[side] - 1) })}>
                  <img alt="" src={asset("icons/fp-qr-minus.svg")} className="h-6 w-6" />
                </button>
                <span className={clsx("text-[10px] font-medium leading-[10px]", TEXT_PRIMARY)}>{design.margins[side]}mm</span>
                <button type="button" aria-label="+" onClick={() => set("margins", { ...design.margins, [side]: Math.min(30, design.margins[side] + 1) })}>
                  <img alt="" src={asset("icons/fp-qr-plus.svg")} className="h-6 w-6" />
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className={section}>
        <span className={LABEL}>{t("floorPlan.qr.design.qrTemplate")}</span>
        <div className="flex items-start justify-between">
          {(["classic", "modern", "minimal", "rounded"] as const).map((style) => (
            <button key={style} type="button" onClick={() => set("qrStyle", style)} className="flex w-[52px] flex-col items-center gap-1">
              <span className={clsx("grid h-12 w-full place-items-center rounded-[8px] border", design.qrStyle === style ? "border-[#0d6efd]" : BORDER_300)}>
                <QrCode value={qrValue(style)} size={40} />
              </span>
              <span className={clsx("text-[10px] font-medium leading-[10px]", TEXT_PRIMARY)}>{t(`floorPlan.qr.style.${style}`)}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("floorPlan.qr.design.logo")}>
            <span className={clsx("relative flex h-10 items-center justify-center overflow-hidden rounded-[8px] border", BORDER_300)}>
              {design.logo ? <img alt="" src={design.logo} className="h-full w-full object-cover" /> : <span className={clsx("text-[12px]", TEXT_SECONDARY)}>{t("floorPlan.qr.design.upload")}</span>}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => set("logo", String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </span>
          </Field>
          <Field label={t("floorPlan.qr.design.primary")}>
            <span className={clsx("flex h-10 items-center gap-2 rounded-[8px] border px-1", BORDER_300)}>
              <input type="color" value={design.primary} onChange={(e) => set("primary", e.target.value.toUpperCase())} className="h-8 w-8 cursor-pointer rounded-[6px] border-0 bg-transparent p-0" />
              <span className={clsx("text-[12px] font-semibold", TEXT_PRIMARY)}>{design.primary}</span>
            </span>
          </Field>
        </div>
        <span className={LABEL}>{t("floorPlan.qr.design.background")}</span>
        <div className="flex items-center gap-2">
          {["#000000", "#FFFFFF"].map((c) => (
            <button key={c} type="button" onClick={() => set("background", c)} className={clsx("flex h-8 items-center gap-1 rounded-[6px] border px-1 text-[10px] font-medium", design.background === c ? "border-[#0d6efd]" : BORDER_300, TEXT_PRIMARY)}>
              <span className="h-5 w-5 rounded-[4px] border border-[#cbd5e1]" style={{ background: c }} />
              {c}
            </button>
          ))}
          <label className={clsx("relative flex h-8 cursor-pointer items-center gap-1 rounded-[6px] border px-1 text-[10px] font-semibold", BORDER_300, TEXT_PRIMARY)}>
            <span className="h-5 w-5 rounded-[4px] border border-[#cbd5e1]" style={{ background: design.background }} />
            {t("floorPlan.qr.design.custom")}
            <input type="color" value={design.background} onChange={(e) => set("background", e.target.value.toUpperCase())} className="absolute inset-0 opacity-0" />
          </label>
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Switch checked={design.showMessage} onChange={(v) => set("showMessage", v)} label={t("floorPlan.qr.design.showMessage")} />
        <Field label={t("floorPlan.qr.design.message")}>
          <textarea
            value={design.message}
            onChange={(e) => set("message", e.target.value.slice(0, 80))}
            placeholder={t("floorPlan.qr.design.messagePlaceholder")}
            className={clsx("h-[72px] resize-none rounded-[8px] border bg-transparent p-2 text-[12px] outline-none placeholder:text-[#94a3b8]", BORDER_300, TEXT_PRIMARY)}
          />
        </Field>
        <Switch checked={design.showNumber} onChange={(v) => set("showNumber", v)} label={t("floorPlan.qr.design.showNumber")} />
        <Field label={t("floorPlan.qr.design.numberStyle")}>
          <Select value={design.numberStyle} onChange={(v) => set("numberStyle", v)} options={(["circle", "plain", "badge"] as const).map((v) => ({ value: v, label: t(`floorPlan.qr.numberStyle.${v}`) }))} />
        </Field>
      </div>
    </aside>
  );
}

/** One printed card at preview scale (Figma 2012:190398 grid). */
function TentCard({ doc, table, code, design }: { doc: FloorPlanDoc; table: FloorTable; code: string; design: QrDesign }) {
  const { t } = useI18n();
  return (
    <div className="flex aspect-[2/3] flex-col items-center gap-1 overflow-hidden rounded-[2px] pt-2" style={{ background: design.background === "#FFFFFF" ? "#EAE4D9" : design.background }}>
      {design.showNumber && (
        <span
          className={clsx("grid min-w-6 place-items-center text-[9px] font-bold", design.numberStyle === "circle" && "h-6 rounded-full border-2", design.numberStyle === "badge" && "rounded-full px-2 text-white")}
          style={{ color: design.numberStyle === "badge" ? undefined : design.primary, borderColor: design.primary, background: design.numberStyle === "badge" ? design.primary : undefined }}
        >
          T{table.number}
        </span>
      )}
      {design.logo && <img alt="" src={design.logo} className="h-4 max-w-[70%] object-contain" />}
      <span className="px-1 text-center text-[8px] font-bold uppercase leading-tight" style={{ color: design.primary }}>{doc.name}</span>
      <QrCode value={qrValue(code)} size={Math.round(QR_SIZE_PX[design.qrSize] * 0.85)} />
      <span className="px-1 text-center text-[7px] font-semibold leading-tight text-[#0f172a]">{t("floorPlan.qr.card.cta")}</span>
      {design.showMessage && design.message && <span className="px-1 text-center text-[7px] leading-tight text-[#0f172a]">{design.message}</span>}
      <span className="mt-auto w-full bg-[#16213e] py-0.5 text-center text-[7px] italic text-white">{t("floorPlan.qr.card.thanks")}</span>
    </div>
  );
}

/** Preview pages, print summary and a single-table reprint (Figma 2012:190398). */
function ReviewStep({
  doc,
  chosen,
  design,
  setDesign,
  qr,
  onEdit,
}: {
  doc: FloorPlanDoc;
  chosen: FloorTable[];
  design: QrDesign;
  setDesign: (d: QrDesign) => void;
  qr: ReturnType<typeof useTableQr>;
  onEdit: () => void;
}) {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(0);
  const [singleId, setSingleId] = useState("");
  const pages = Math.max(1, Math.ceil(chosen.length / design.perPage));
  const current = Math.min(page, pages - 1);
  const shown = chosen.slice(current * design.perPage, (current + 1) * design.perPage);
  const codeOf = (tb: FloorTable) => qr.record[tb.id]?.code ?? `QR-T${tb.number}`;
  const single = chosen.find((tb) => tb.id === singleId) ?? null;
  const singleQr = single ? qr.record[single.id] : undefined;
  const singleStatus = statusOf(singleQr);
  const card = clsx("rounded-[20px] border p-2", BORDER_300);
  const pager = clsx("grid h-10 w-10 place-items-center rounded-[8px] border text-[18px] disabled:opacity-40", BORDER_300, TEXT_PRIMARY);

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      <section className={clsx(card, "flex flex-col gap-4 p-3")}>
        <div className="flex items-center justify-between">
          <span className={clsx("text-[14px] font-medium", TEXT_PRIMARY)}>
            {t("floorPlan.qr.review.preview")} <span className={clsx("text-[12px]", TEXT_SECONDARY)}>({t("floorPlan.qr.review.pageOf").replace("{n}", String(current + 1)).replace("{total}", String(pages))})</span>
          </span>
          <span className={clsx("flex items-center gap-2 text-[14px] font-medium", TEXT_PRIMARY)}>
            {t("floorPlan.qr.review.perPage")}
            <Select value={String(design.perPage)} onChange={(v) => setDesign({ ...design, perPage: Number(v) })} options={["4", "8", "12", "16"].map((v) => ({ value: v, label: v }))} />
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {shown.map((tb) => (
            <TentCard key={tb.id} doc={doc} table={tb} code={codeOf(tb)} design={design} />
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button type="button" className={pager} disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="‹">‹</button>
          <span className={clsx("text-[12px]", TEXT_PRIMARY)}>{t("floorPlan.qr.review.pageOf").replace("{n}", String(current + 1)).replace("{total}", String(pages))}</span>
          <button type="button" className={pager} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="›">›</button>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <section className={clsx(card, "flex items-center justify-between")}>
          <span className="flex flex-col gap-1">
            <span className={clsx("text-[16px] font-semibold", TEXT_PRIMARY)}>{t("floorPlan.qr.review.selected")}</span>
            <span className={clsx("text-[12px]", TEXT_SECONDARY)}>
              {chosen.length > 0 ? `T${chosen[0].number} : T${chosen[chosen.length - 1].number}` : "—"}
            </span>
          </span>
          <button type="button" onClick={onEdit} className="h-10 rounded-[8px] border border-[#0d6efd] px-3 text-[16px] font-semibold text-[#0d6efd]">
            {t("floorPlan.qr.review.edit")}
          </button>
        </section>
        <section className={clsx(card, "flex flex-col gap-3")}>
          <span className={clsx("text-[16px] font-semibold", TEXT_PRIMARY)}>{t("floorPlan.qr.review.summary")}</span>
          <div className={clsx("flex flex-col gap-2 rounded-[8px] border p-2", BORDER_300)}>
            <DetailRow label={t("floorPlan.qr.review.template")}>{t(`floorPlan.qr.template.${design.template}`)}</DetailRow>
            <DetailRow label={t("floorPlan.qr.design.paper")}>{design.paper}</DetailRow>
            <DetailRow label={t("floorPlan.qr.review.perPageShort")}>{design.perPage}</DetailRow>
            <DetailRow label={t("floorPlan.qr.review.selectedCount")}>{chosen.length}</DetailRow>
            <DetailRow label={t("floorPlan.qr.review.totalPages")}>{pages}</DetailRow>
          </div>
        </section>
        <section className={clsx(card, "flex flex-col gap-3")}>
          <span className="flex flex-col gap-1">
            <span className={clsx("text-[16px] font-semibold", TEXT_PRIMARY)}>{t("floorPlan.qr.review.individual")}</span>
            <span className={clsx("text-[12px]", TEXT_SECONDARY)}>{t("floorPlan.qr.review.individualHint")}</span>
          </span>
          <Field label={t("floorPlan.qr.review.table")}>
            <Select
              value={singleId}
              onChange={setSingleId}
              options={[{ value: "", label: t("floorPlan.qr.review.selectTable") }, ...chosen.map((tb) => ({ value: tb.id, label: `T${tb.number}` }))]}
            />
          </Field>
          {single && (
            <>
              <span className={clsx("text-[12px] font-medium", TEXT_SECONDARY)}>{tableMeta(doc, single, t)}</span>
              <div className="flex justify-center">
                <QrCode value={qrValue(codeOf(single))} size={120} />
              </div>
              <div className={clsx("flex flex-col gap-2 rounded-[8px] border p-2", BORDER_300)}>
                <DetailRow label={t("floorPlan.qr.field.status")} valueClassName={QR_STATUS_TEXT[singleStatus]}>{t(`floorPlan.qr.status.${singleStatus}`)}</DetailRow>
                <DetailRow label={t("floorPlan.qr.field.id")}>{singleQr?.code ?? "—"}</DetailRow>
                <DetailRow label={t("floorPlan.qr.field.lastPrinted")}>{formatDate(singleQr?.lastPrintedAt ?? null, locale, true)}</DetailRow>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => downloadFile(`table-${single.number}-qr.svg`, qrSvgMarkup(codeOf(single)))} className={BTN_MODAL_OUTLINE}>
                  {t("floorPlan.qr.download")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const code = qr.generate([single])[single.id]?.code;
                    if (code) printTents(doc, [{ table: single, code }], design, t);
                    qr.markPrinted([single.id]);
                  }}
                  className={BTN_MODAL_PRIMARY}
                >
                  {t("floorPlan.qr.printThis")}
                </button>
              </div>
              <button type="button" onClick={() => qr.generate([single], true)} className={BTN_MODAL_WARNING}>
                {t("floorPlan.qr.regenerate")}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
