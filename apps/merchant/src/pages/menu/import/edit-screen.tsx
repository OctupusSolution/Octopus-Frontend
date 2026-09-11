// Screen 3 — "Edit Detected Items & Sections".
//
// Where the review screen confirms items one at a time, this one is for bulk
// correction: a table per section, sections reorderable, prices adjustable in
// one go. Edits apply as they are typed ("Changes are autosaved", the frame's
// own promise), because in a table nobody expects to press Save per row.
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePenLine,
  GripVertical,
  Info,
  Lightbulb,
  ListChecks,
  Plus,
  Search,
  ShieldCheck,
  SquarePen,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  addDetectedItem,
  addDetectedSection,
  bandFor,
  blankDetectedItem,
  duplicateDetectedItem,
  findItem,
  firstWithIssue,
  moveItemToSection,
  needsReview,
  parseItemsCsv,
  removeDetectedItem,
  removeDetectedSection,
  renameDetectedSection,
  reorderItems,
  reorderSections,
  siblingItem,
  summarize,
  updateDetectedItem,
  type DetectedItem,
  type DetectedSection,
  type DetectionResult,
} from "@/entities/menu/ai-import";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { useI18n } from "@/app/providers/i18n-provider";
import { AI, BAND_TONE, card, fill, outlineButton, tintedButton } from "./ai-style";
import { BandPill, Breadcrumb, ConfidencePill, NextButton, PageTitle, SaveDraftButton, StatIcon } from "./chrome";
import {
  AllergensTab,
  ConfidenceMeter,
  EditorTabs,
  FieldLabel,
  IssueNotes,
  KebabMenu,
  LaterTab,
  PriceInput,
  TagEditor,
  inputClass,
} from "./item-fields";
import { BulkPriceModal, ConfirmModal, FindReplaceModal, SectionNameModal, SummaryModal } from "./modals";
import { sessionId, updateResult, useImportSession } from "./session-store";
import { useCommitImport } from "./use-commit";

const PAGE_SIZE = 12;
const EDIT_TABS = ["details", "modifiers", "allergens", "nutrition", "advanced"] as const;
type EditTab = (typeof EDIT_TABS)[number];

/** 1 2 3 … 7 — at most five numbers, with gaps collapsed. */
export function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i);
  const keep = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total));
  if (current <= 1) [1, 2].forEach((p) => keep.add(p));
  if (current >= total - 2) [total - 2, total - 3].forEach((p) => keep.add(p));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

type ModalState =
  | { kind: "none" }
  | { kind: "add-section" }
  | { kind: "rename-section"; section: DetectedSection }
  | { kind: "delete-section"; section: DetectedSection }
  | { kind: "delete-item"; item: DetectedItem }
  | { kind: "bulk" }
  | { kind: "find" }
  | { kind: "summary" };

export function EditScreen() {
  const { t } = useI18n();
  const session = useImportSession();
  const result = session.result as DetectionResult;
  const { ready, commit } = useCommitImport();
  const summary = summarize(result);

  const [sectionId, setSectionId] = useState<string | null>(() => {
    // Open on the first section that has something to fix, else the first.
    const flagged = result.sections.find((s) => s.items.some(needsReview));
    return (flagged ?? result.sections[0])?.id ?? null;
  });
  const section = result.sections.find((s) => s.id === sectionId) ?? result.sections[0] ?? null;
  const [itemId, setItemId] = useState<string | null>(() => {
    const s = result.sections.find((x) => x.id === sectionId);
    return (s?.items.find(needsReview) ?? s?.items[0])?.id ?? null;
  });
  const selected = itemId ? findItem(result, itemId) : null;
  const [page, setPage] = useState(() => {
    const at = section?.items.findIndex((i) => i.id === itemId) ?? -1;
    return at > 0 ? Math.floor(at / PAGE_SIZE) : 0;
  });
  const [reorderMode, setReorderMode] = useState(false);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [dragSection, setDragSection] = useState<number | null>(null);
  const [dragItem, setDragItem] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const items = section?.items ?? [];
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function flash(tone: "ok" | "error", text: string) {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 3500);
  }

  function openSection(id: string) {
    setSectionId(id);
    setPage(0);
    const s = result.sections.find((x) => x.id === id);
    setItemId(s?.items[0]?.id ?? null);
  }

  /** Select any item, following it to its section and page. */
  function selectItem(id: string, within: DetectionResult = result) {
    const found = findItem(within, id);
    if (!found) return;
    setSectionId(found.section.id);
    setItemId(id);
    setPage(Math.floor(found.index / PAGE_SIZE));
  }

  function addItem() {
    if (!section) {
      flash("error", t("menuAi.edit.needSection"));
      return;
    }
    const item = blankDetectedItem(sessionId("ai-new"), t("menuAi.edit.newItemName"));
    let next = result;
    updateResult((r) => (next = addDetectedItem(r, section.id, item)));
    selectItem(item.id, next);
  }

  const csvPicker = useRef<HTMLInputElement>(null);

  const quickActions = [
    { icon: <Plus size={16} />, label: t("menuAi.edit.addItem"), onClick: addItem },
    { icon: <Upload size={16} />, label: t("menuAi.edit.addSection"), onClick: () => setModal({ kind: "add-section" }) },
    { icon: <FilePenLine size={16} />, label: t("menuAi.edit.bulkPrices"), onClick: () => setModal({ kind: "bulk" }) },
    { icon: <Search size={16} />, label: t("menuAi.edit.findReplace"), onClick: () => setModal({ kind: "find" }) },
    { icon: <Upload size={16} />, label: t("menuAi.edit.importCsv"), onClick: () => csvPicker.current?.click() },
  ];

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <input
        ref={csvPicker}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!section) {
            flash("error", t("menuAi.edit.needSection"));
            return;
          }
          file
            .text()
            .then((text) => {
              const parsed = parseItemsCsv(text, () => sessionId("ai-csv"));
              if (parsed.length === 0) {
                flash("error", t("menuAi.edit.csvEmpty"));
                return;
              }
              updateResult((r) => parsed.reduce((acc, item) => addDetectedItem(acc, section.id, item), r));
              flash("ok", fill(t("menuAi.edit.csvDone"), { n: parsed.length, section: section.name }));
            })
            .catch(() => flash("error", t("menuAi.edit.csvEmpty")));
        }}
      />

      <Breadcrumb current={t("menuAi.crumb.edit")} trail={[{ label: t("menuAi.crumb.upload"), to: "/menu/import" }]} />
      <PageTitle
        variant="badge"
        title={t("menuAi.edit.title")}
        subtitle={t("menuAi.edit.subtitle")}
        actions={
          <>
            <SaveDraftButton onClick={() => commit("draft")} disabled={!ready} />
            <NextButton label={t("menuAi.edit.next")} onClick={() => commit("publish")} disabled={!ready} />
          </>
        }
      />

      {/* Stats strip */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[13px] text-[var(--octo-text-primary)]">
          <StatIcon tone="success" size={26}><ShieldCheck size={14} /></StatIcon>
          {fill(t("menuAi.edit.statSections"), { n: summary.sections })}
        </span>
        <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[13px] text-[var(--octo-text-primary)]">
          <StatIcon tone="violet" size={26}><ListChecks size={14} /></StatIcon>
          {fill(t("menuAi.edit.statItems"), { n: summary.items })}
        </span>
        <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[13px] text-[var(--octo-text-primary)]">
          <StatIcon tone="success" size={26}><ShieldCheck size={14} /></StatIcon>
          {fill(t("menuAi.edit.statHigh"), { n: summary.high })}
        </span>
        <button
          type="button"
          disabled={summary.needReview === 0}
          onClick={() => {
            const first = result.sections.flatMap((s) => s.items).find(needsReview);
            if (first) selectItem(first.id);
          }}
          className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--octo-tone-warning-border)] bg-[var(--octo-card)] px-3 py-2 text-[13px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-warning-bg)] disabled:cursor-default"
        >
          <StatIcon tone="warning" size={26}><AlertTriangle size={14} /></StatIcon>
          <span>
            <b className="font-semibold text-[var(--octo-tone-warning-text)]">{summary.needReview}</b>{" "}
            {t("menuAi.edit.statReview")}
          </span>
        </button>
        <span className="mx-1 hidden h-8 w-px bg-[var(--octo-border-card)] sm:block" aria-hidden />
        <button type="button" onClick={() => setModal({ kind: "summary" })} className={clsx(tintedButton, "h-[42px] px-4")}>
          <Info size={16} aria-hidden />
          {t("menuAi.edit.viewSummary")}
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className={clsx(
            "mt-3 inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-[13px]",
            notice.tone === "ok"
              ? "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]"
              : "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]"
          )}
        >
          {notice.text}
          <button type="button" aria-label={t("menuAi.dismiss")} onClick={() => setNotice(null)}>
            <X size={14} aria-hidden />
          </button>
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_290px] 2xl:grid-cols-[250px_minmax(0,1fr)_360px]">
        {/* Sections */}
        <section className={clsx(card, "flex flex-col p-3")}>
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("menuAi.edit.sections")}</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={t("menuAi.edit.addSection")}
                title={t("menuAi.edit.addSection")}
                onClick={() => setModal({ kind: "add-section" })}
                className={clsx(outlineButton, "h-8 gap-1 whitespace-nowrap px-2 text-[12px]", AI.text)}
              >
                <Plus size={14} aria-hidden />
                {/* The column is at its narrowest between lg and 2xl; the dashed
                    "Add Section" under the list still carries the words there. */}
                <span className="lg:hidden 2xl:inline">{t("menuAi.edit.addSection")}</span>
              </button>
              <button
                type="button"
                aria-label={t("menuAi.edit.sortSections")}
                title={t("menuAi.edit.sortSections")}
                onClick={() =>
                  updateResult((r) => ({ ...r, sections: [...r.sections].sort((a, b) => a.name.localeCompare(b.name)) }))
                }
                className={clsx(outlineButton, "h-8 w-8 px-0")}
              >
                <ArrowDownUp size={14} aria-hidden />
              </button>
            </div>
          </div>
          <ul className="space-y-2">
            {result.sections.map((s, index) => {
              const active = s.id === section?.id;
              return (
                <li
                  key={s.id}
                  draggable
                  onDragStart={() => setDragSection(index)}
                  onDragOver={(e) => dragSection !== null && e.preventDefault()}
                  onDrop={() => {
                    if (dragSection !== null) updateResult((r) => reorderSections(r, dragSection, index));
                    setDragSection(null);
                  }}
                  onDragEnd={() => setDragSection(null)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-[10px] border px-2 py-2 transition-colors",
                    active ? clsx(AI.border, AI.soft) : "border-[var(--octo-border-card)] hover:bg-[var(--octo-hover)]",
                    dragSection === index && "opacity-50"
                  )}
                >
                  <GripVertical size={15} className="shrink-0 cursor-grab text-[var(--octo-text-faint)]" aria-hidden />
                  <button type="button" data-section={s.name} onClick={() => openSection(s.id)} className="min-w-0 flex-1 truncate text-start text-[13.5px] font-medium text-[var(--octo-text-primary)]">
                    {s.name}
                  </button>
                  <span className={clsx("rounded-[6px] border px-1.5 text-[11.5px] tabular-nums", active ? clsx(AI.border, AI.text) : "border-[var(--octo-border-card)] text-[var(--octo-text-secondary)]")}>
                    {s.items.length}
                  </span>
                  <KebabMenu
                    label={fill(t("menuAi.edit.sectionActions"), { name: s.name })}
                    actions={[
                      { label: t("menuAi.edit.rename"), onSelect: () => setModal({ kind: "rename-section", section: s }) },
                      { label: t("menuAi.edit.moveUp"), disabled: index === 0, onSelect: () => updateResult((r) => reorderSections(r, index, index - 1)) },
                      { label: t("menuAi.edit.moveDown"), disabled: index === result.sections.length - 1, onSelect: () => updateResult((r) => reorderSections(r, index, index + 1)) },
                      { label: t("menuAi.edit.deleteSection"), danger: true, onSelect: () => setModal({ kind: "delete-section", section: s }) },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setModal({ kind: "add-section" })}
            className={clsx("mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed py-2.5 text-[13px] font-medium", AI.softBorder, AI.text, "hover:bg-[var(--octo-hover)]")}
          >
            <Plus size={15} aria-hidden />
            {t("menuAi.edit.addSection")}
          </button>
          <div className={clsx("mt-auto flex items-start gap-2 rounded-[10px] px-3 py-3 text-[12.5px]", AI.soft, AI.text)}>
            <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {t("menuAi.edit.dragTip")}
              <span className="block opacity-80">{t("menuAi.edit.autosaved")}</span>
            </span>
          </div>
        </section>

        {/* Items table */}
        <section className={clsx(card, "flex min-w-0 flex-col")} ref={tableRef}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--octo-border-card)] px-4 py-3">
            <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
              {section ? section.name : t("menuAi.edit.noSection")}{" "}
              {section && <span className="font-normal text-[var(--octo-text-secondary)]">({fill(t("menuAi.count.itemsN"), { n: items.length })})</span>}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={addItem} className={clsx(outlineButton, "h-9", AI.text)}>
                <Plus size={15} aria-hidden />
                {t("menuAi.edit.addItem")}
              </button>
              <button type="button" aria-pressed={reorderMode} onClick={() => setReorderMode((m) => !m)} className={clsx(reorderMode ? tintedButton : outlineButton, "h-9")}>
                <ArrowDownUp size={15} aria-hidden />
                {reorderMode ? t("menuAi.edit.doneReordering") : t("menuAi.edit.reorderItems")}
              </button>
              <button type="button" onClick={() => setModal({ kind: "bulk" })} className={clsx(outlineButton, "h-9")}>
                <SquarePen size={15} aria-hidden />
                {t("menuAi.edit.bulkEdit")}
              </button>
              <button
                type="button"
                disabled={!section}
                onClick={() => section && setModal({ kind: "delete-section", section })}
                className={clsx(outlineButton, "h-9 text-[var(--octo-tone-danger-text)]")}
              >
                <Trash2 size={15} aria-hidden />
                {t("menuAi.edit.deleteSection")}
              </button>
            </div>
          </div>

          {reorderMode && (
            <p className={clsx("px-4 pt-2 text-[12.5px]", AI.text)}>{t("menuAi.edit.reorderHint")}</p>
          )}

          <div className="overflow-x-auto octo-scroll">
            <table className="w-full min-w-[540px] border-separate border-spacing-y-1.5 px-3 text-[13px]">
              <thead>
                <tr className="text-start text-[12px] font-medium text-[var(--octo-text-secondary)]">
                  <th className="w-8" />
                  <th className="w-8 py-2 text-start font-medium">#</th>
                  <th className="py-2 text-start font-medium">{t("menuAi.edit.colName")}</th>
                  <th className="w-[90px] py-2 text-start font-medium">{t("menuAi.edit.colPrice")}</th>
                  <th className="w-[78px] py-2 text-center font-medium">{t("menuAi.edit.colConfidence")}</th>
                  <th className="w-[78px] py-2 text-center font-medium">{t("menuAi.edit.colStatus")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.map((item, i) => {
                  const index = safePage * PAGE_SIZE + i;
                  const active = item.id === itemId;
                  const cell = clsx(
                    "border-y py-2 align-middle first:rounded-s-[10px] first:border-s last:rounded-e-[10px] last:border-e",
                    active ? clsx(AI.border, "bg-[var(--octo-tone-violet-bg)]") : "border-transparent border-b-[var(--octo-divider)]"
                  );
                  return (
                    <tr
                      key={item.id}
                      data-item-row={item.id}
                      draggable={reorderMode}
                      onDragStart={() => setDragItem(index)}
                      onDragOver={(e) => dragItem !== null && e.preventDefault()}
                      onDrop={() => {
                        if (dragItem !== null && section) updateResult((r) => reorderItems(r, section.id, dragItem, index));
                        setDragItem(null);
                      }}
                      onDragEnd={() => setDragItem(null)}
                      onClick={() => setItemId(item.id)}
                      className={clsx("cursor-pointer", dragItem === index && "opacity-50")}
                    >
                      <td className={clsx(cell, "ps-2")}>
                        <GripVertical size={16} className={clsx(reorderMode ? "cursor-grab text-[var(--octo-text-secondary)]" : "text-[var(--octo-text-faint)] opacity-60")} aria-hidden />
                      </td>
                      <td className={clsx(cell, "tabular-nums text-[var(--octo-text-primary)]")}>{index + 1}</td>
                      <td className={cell}>
                        <div className="flex items-center gap-3">
                          <span className="h-10 w-12 shrink-0 overflow-hidden rounded-[8px] bg-[var(--octo-track)]">
                            {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <input
                              aria-label={t("menuAi.editor.name")}
                              value={item.name}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={() => setItemId(item.id)}
                              onChange={(e) => updateResult((r) => updateDetectedItem(r, item.id, { name: e.target.value }))}
                              className="w-full rounded-[6px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[13px] font-medium text-[var(--octo-text-primary)] focus:border-[#3D1DF3] focus:outline-none"
                            />
                            <input
                              aria-label={t("menuAi.editor.description")}
                              value={item.description}
                              placeholder={t("menuAi.edit.descPlaceholder")}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={() => setItemId(item.id)}
                              onChange={(e) => updateResult((r) => updateDetectedItem(r, item.id, { description: e.target.value }))}
                              className="w-full rounded-[6px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[12px] text-[var(--octo-text-secondary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#3D1DF3] focus:outline-none"
                            />
                          </div>
                        </div>
                      </td>
                      <td className={cell} onClick={(e) => e.stopPropagation()}>
                        <PriceInput
                          ariaLabel={t("menuAi.editor.price")}
                          value={item.price}
                          onChange={(price) => updateResult((r) => updateDetectedItem(r, item.id, { price }))}
                          className={clsx("w-[76px] py-1.5", item.price === null && "border-[var(--octo-tone-danger-dot)]")}
                        />
                      </td>
                      <td className={clsx(cell, "text-center")}>
                        <ConfidencePill value={item.confidence} />
                      </td>
                      <td className={clsx(cell, "text-center")}>
                        <BandPill band={bandFor(item.confidence)} reviewed={item.reviewed && item.confidence < 90} />
                      </td>
                      <td className={clsx(cell, "pe-1")}>
                        <KebabMenu
                          label={fill(t("menuAi.edit.itemActions"), { name: item.name })}
                          actions={[
                            { label: t("menuAi.edit.editItem"), onSelect: () => setItemId(item.id) },
                            {
                              label: t("menuAi.edit.duplicate"),
                              onSelect: () => {
                                const id = sessionId("ai-copy");
                                let next = result;
                                updateResult((r) => (next = duplicateDetectedItem(r, item.id, id)));
                                selectItem(id, next);
                              },
                            },
                            item.reviewed
                              ? { label: t("menuAi.edit.unmarkReviewed"), onSelect: () => updateResult((r) => updateDetectedItem(r, item.id, { reviewed: false })) }
                              : { label: t("menuAi.edit.markReviewed"), onSelect: () => updateResult((r) => updateDetectedItem(r, item.id, { reviewed: true })) },
                            { label: t("menuAi.edit.moveUp"), disabled: index === 0, onSelect: () => section && updateResult((r) => reorderItems(r, section.id, index, index - 1)) },
                            { label: t("menuAi.edit.moveDown"), disabled: index === items.length - 1, onSelect: () => section && updateResult((r) => reorderItems(r, section.id, index, index + 1)) },
                            { label: t("menuAi.editor.delete"), danger: true, onSelect: () => setModal({ kind: "delete-item", item }) },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {section && items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">{t("menuAi.edit.emptySection")}</p>
                <button type="button" onClick={addItem} className={clsx(tintedButton, "mt-3 h-9")}>
                  <Plus size={15} aria-hidden />
                  {t("menuAi.edit.addItem")}
                </button>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-auto flex flex-wrap items-center justify-center gap-3 border-t border-[var(--octo-border-card)] px-4 py-3 sm:justify-between">
              <span className="hidden sm:block" />
              <nav aria-label={t("menuAi.edit.pagination")} className="flex items-center gap-1.5">
                <button type="button" aria-label={t("menuAi.review.prevPage")} disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className={clsx(outlineButton, "h-8 w-8 px-0")}>
                  <ChevronLeft size={15} className="rtl:rotate-180" aria-hidden />
                </button>
                {pageList(safePage, pages).map((p, i) =>
                  p === "gap" ? (
                    <span key={`gap-${i}`} className="px-1 text-[var(--octo-text-secondary)]">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      aria-current={p === safePage ? "page" : undefined}
                      onClick={() => setPage(p)}
                      className={clsx("h-8 min-w-8 rounded-[8px] px-2 text-[13px] font-medium tabular-nums", p === safePage ? AI.solid : clsx(outlineButton, "px-2"))}
                    >
                      {p + 1}
                    </button>
                  )
                )}
                <button type="button" aria-label={t("menuAi.review.nextPage")} disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className={clsx(outlineButton, "h-8 w-8 px-0")}>
                  <ChevronRight size={15} className="rtl:rotate-180" aria-hidden />
                </button>
              </nav>
              <span className="text-[12.5px] text-[var(--octo-text-secondary)]">
                {fill(t("menuAi.edit.showing"), {
                  from: safePage * PAGE_SIZE + 1,
                  to: safePage * PAGE_SIZE + visible.length,
                  total: items.length,
                })}
              </span>
            </div>
          )}
        </section>

        {/* Editor */}
        <aside className="min-w-0 lg:col-span-2 xl:col-span-1">
          {selected ? (
            <TableEditor
              key={selected.item.id}
              item={selected.item}
              sectionId={selected.section.id}
              result={result}
              onSelect={(id) => selectItem(id)}
              onClose={() => setItemId(null)}
              onDelete={(item) => setModal({ kind: "delete-item", item })}
              onDuplicate={(item) => {
                const id = sessionId("ai-copy");
                let next = result;
                updateResult((r) => (next = duplicateDetectedItem(r, item.id, id)));
                selectItem(id, next);
              }}
            />
          ) : (
            <div className={clsx(card, "flex min-h-[260px] flex-col items-center justify-center px-6 text-center")}>
              <SquarePen size={28} className={AI.text} aria-hidden />
              <p className="mt-3 text-[14px] font-medium text-[var(--octo-text-primary)]">{t("menuAi.editor.emptyTitle")}</p>
              <p className="mt-1 text-[12.5px] text-[var(--octo-text-secondary)]">{t("menuAi.edit.emptyEditor")}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Quick actions, tips, legend */}
      <section className={clsx(card, "mt-4 grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]")}>
        <div>
          <h2 className={clsx("text-[13.5px] font-semibold", AI.text)}>{t("menuAi.edit.quickActions")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <button key={a.label} type="button" onClick={a.onClick} className={clsx(outlineButton, "h-10")}>
                <span className={AI.text} aria-hidden>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:border-s lg:border-[var(--octo-border-card)] lg:ps-5">
          <h2 className={clsx("text-[13.5px] font-semibold", AI.text)}>{t("menuAi.edit.tips")}</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-[12.5px] text-[var(--octo-text-secondary)]">
            <li>{t("menuAi.edit.tip1")}</li>
            <li>{t("menuAi.edit.tip2")}</li>
            <li>{t("menuAi.edit.tip3")}</li>
          </ul>
        </div>
        <div className="lg:border-s lg:border-[var(--octo-border-card)] lg:ps-5">
          <h2 className={clsx("text-[13.5px] font-semibold", AI.text)}>{t("menuAi.edit.legend")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["high", "medium", "low"] as const).map((band) => (
              <span key={band} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-card)] px-2.5 py-1.5 text-[12px] text-[var(--octo-text-primary)]">
                <span className={clsx("h-2.5 w-2.5 rounded-full", BAND_TONE[band].bar)} aria-hidden />
                {t(`menuAi.legendBand.${band}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Dialogs */}
      <SectionNameModal
        open={modal.kind === "add-section"}
        initial=""
        title={t("menuAi.edit.addSection")}
        onClose={() => setModal({ kind: "none" })}
        onSubmit={(name) => {
          const id = sessionId("ai-sec");
          updateResult((r) => addDetectedSection(r, id, name));
          setModal({ kind: "none" });
          setSectionId(id);
          setItemId(null);
          setPage(0);
        }}
      />
      <SectionNameModal
        open={modal.kind === "rename-section"}
        initial={modal.kind === "rename-section" ? modal.section.name : ""}
        title={t("menuAi.edit.renameSection")}
        onClose={() => setModal({ kind: "none" })}
        onSubmit={(name) => {
          if (modal.kind === "rename-section") updateResult((r) => renameDetectedSection(r, modal.section.id, name));
          setModal({ kind: "none" });
        }}
      />
      <ConfirmModal
        open={modal.kind === "delete-section"}
        title={t("menuAi.confirmDeleteSection.title")}
        body={
          modal.kind === "delete-section"
            ? fill(t("menuAi.confirmDeleteSection.body"), { name: modal.section.name, n: modal.section.items.length })
            : ""
        }
        confirmLabel={t("menuAi.edit.deleteSection")}
        onClose={() => setModal({ kind: "none" })}
        onConfirm={() => {
          if (modal.kind !== "delete-section") return;
          const removed = modal.section.id;
          const rest = result.sections.filter((s) => s.id !== removed);
          updateResult((r) => removeDetectedSection(r, removed));
          setModal({ kind: "none" });
          if (section?.id === removed || itemId === null || findItem(result, itemId)?.section.id === removed) {
            setSectionId(rest[0]?.id ?? null);
            setItemId(rest[0]?.items[0]?.id ?? null);
            setPage(0);
          }
        }}
      />
      <ConfirmModal
        open={modal.kind === "delete-item"}
        title={t("menuAi.confirmDeleteItem.title")}
        body={modal.kind === "delete-item" ? fill(t("menuAi.confirmDeleteItem.body"), { name: modal.item.name }) : ""}
        confirmLabel={t("menuAi.editor.delete")}
        onClose={() => setModal({ kind: "none" })}
        onConfirm={() => {
          if (modal.kind !== "delete-item") return;
          const gone = modal.item.id;
          if (itemId === gone) {
            const next = siblingItem(result, gone, 1) ?? siblingItem(result, gone, -1);
            setItemId(next && findItem(result, next.id)?.section.id === section?.id ? next.id : null);
          }
          updateResult((r) => removeDetectedItem(r, gone));
          setModal({ kind: "none" });
        }}
      />
      <BulkPriceModal
        open={modal.kind === "bulk"}
        result={result}
        sectionId={section?.id ?? null}
        onClose={() => setModal({ kind: "none" })}
        onApply={(next) => {
          updateResult(() => next);
          setModal({ kind: "none" });
          flash("ok", fill(t("menuAi.bulk.done"), { section: section?.name ?? "" }));
        }}
      />
      <FindReplaceModal
        open={modal.kind === "find"}
        result={result}
        onClose={() => setModal({ kind: "none" })}
        onApply={(next, count) => {
          updateResult(() => next);
          setModal({ kind: "none" });
          flash("ok", fill(t("menuAi.find.done"), { n: count }));
        }}
      />
      <SummaryModal
        open={modal.kind === "summary"}
        result={result}
        onClose={() => setModal({ kind: "none" })}
        onPickIssue={(kind) => {
          const item = firstWithIssue(result, kind);
          setModal({ kind: "none" });
          if (item) selectItem(item.id);
        }}
      />
    </div>
  );
}

function TableEditor({
  item,
  sectionId,
  result,
  onSelect,
  onClose,
  onDelete,
  onDuplicate,
}: {
  item: DetectedItem;
  sectionId: string;
  result: DetectionResult;
  onSelect: (id: string) => void;
  onClose: () => void;
  onDelete: (item: DetectedItem) => void;
  onDuplicate: (item: DetectedItem) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<EditTab>("details");
  const patch = (p: Partial<DetectedItem>) => updateResult((r) => updateDetectedItem(r, item.id, p));
  const picker = useFilePicker((url) => patch({ image: url }));
  const band = bandFor(item.confidence);
  const prev = useMemo(() => siblingItem(result, item.id, -1), [result, item.id]);
  const next = useMemo(() => siblingItem(result, item.id, 1), [result, item.id]);
  const iconButton = "rounded-[6px] border border-[var(--octo-border-input)] p-1.5 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] disabled:opacity-40";

  return (
    <section className={clsx(card, "xl:sticky xl:top-4")} aria-label={fill(t("menuAi.editor.editing"), { name: item.name })}>
      {picker.input}
      <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
        <h2 className="min-w-0 truncate text-[15px] text-[var(--octo-text-secondary)]">
          {t("menuAi.editor.editingLabel")} <b className="font-semibold text-[var(--octo-text-primary)]">{item.name || "—"}</b>
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" aria-label={t("menuAi.editor.prev")} disabled={!prev} onClick={() => prev && onSelect(prev.id)} className={iconButton}>
            <ChevronLeft size={15} className="rtl:rotate-180" aria-hidden />
          </button>
          <button type="button" aria-label={t("menuAi.editor.next")} disabled={!next} onClick={() => next && onSelect(next.id)} className={iconButton}>
            <ChevronRight size={15} className="rtl:rotate-180" aria-hidden />
          </button>
          <button type="button" aria-label={t("menuAi.editor.close")} onClick={onClose} className={iconButton}>
            <X size={15} aria-hidden />
          </button>
        </div>
      </header>
      <div className="px-2">
        <EditorTabs tabs={EDIT_TABS} active={tab} onChange={setTab} />
      </div>

      <div className="space-y-3.5 px-4 py-4">
        {tab === "details" && (
          <>
            <div>
              <FieldLabel required htmlFor="ed-name">{t("menuAi.editor.name")}</FieldLabel>
              <input id="ed-name" value={item.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <FieldLabel required htmlFor="ed-price">{t("menuAi.editor.price")}</FieldLabel>
              <PriceInput id="ed-price" value={item.price} onChange={(price) => patch({ price })} />
              {item.price === null && <p className="mt-1 text-[12px] text-[var(--octo-tone-danger-text)]">{t("menuAi.editor.priceMissing")}</p>}
            </div>
            <div>
              <FieldLabel required htmlFor="ed-desc">{t("menuAi.editor.description")}</FieldLabel>
              <textarea id="ed-desc" rows={2} maxLength={200} value={item.description} onChange={(e) => patch({ description: e.target.value })} className={clsx(inputClass, "resize-none")} />
              <p className="mt-0.5 text-end text-[11.5px] tabular-nums text-[var(--octo-text-muted)]">{item.description.length} / 200</p>
            </div>
            <div>
              <FieldLabel required htmlFor="ed-section">{t("menuAi.editor.section")}</FieldLabel>
              <span className="relative flex items-center">
                <select
                  id="ed-section"
                  value={sectionId}
                  onChange={(e) => {
                    const target = e.target.value;
                    let moved = result;
                    updateResult((r) => (moved = moveItemToSection(r, item.id, target)));
                    // Follow the item to where it went.
                    if (findItem(moved, item.id)) onSelect(item.id);
                  }}
                  className={clsx(inputClass, "appearance-none pe-8")}
                >
                  {result.sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute end-2.5 text-[var(--octo-text-muted)]" aria-hidden />
              </span>
            </div>
            <div>
              <FieldLabel>{t("menuAi.editor.image")}</FieldLabel>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="h-[72px] w-[104px] shrink-0 overflow-hidden rounded-[8px] bg-[var(--octo-track)]">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[11.5px] text-[var(--octo-text-muted)]">{t("menuAi.editor.noImage")}</span>
                  )}
                </span>
                <button type="button" onClick={picker.open} className={clsx(tintedButton, "h-9")}>
                  <Upload size={15} aria-hidden />
                  {item.image ? t("menuAi.editor.changeImage") : t("menuAi.editor.addImage")}
                </button>
                <button type="button" disabled={!item.image} onClick={() => patch({ image: null })} className={clsx(outlineButton, "h-9")}>
                  <Trash2 size={15} aria-hidden />
                  {t("menuAi.upload.remove")}
                </button>
              </div>
              {picker.error && <p role="alert" className="mt-1 text-[12px] text-[var(--octo-tone-danger-text)]">{t(`menuAi.imageError.${picker.error}`)}</p>}
            </div>
            <ConfidenceMeter value={item.confidence} variant="edit" />
            <div>
              <FieldLabel htmlFor="ed-status">{t("menuAi.editor.status")}</FieldLabel>
              <span className="relative flex items-center">
                <select
                  id="ed-status"
                  value={item.reviewed ? "reviewed" : "auto"}
                  onChange={(e) => patch({ reviewed: e.target.value === "reviewed" })}
                  className={clsx(inputClass, "appearance-none pe-8")}
                >
                  <option value="auto">{t(`menuAi.band.${band}`)}</option>
                  <option value="reviewed">{t("menuAi.status.reviewed")}</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute end-2.5 text-[var(--octo-text-muted)]" aria-hidden />
              </span>
            </div>
            <IssueNotes item={item} variant="edit" />
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button type="button" onClick={() => onDelete(item)} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[rgb(239_68_68/0.25)] bg-[var(--octo-tone-danger-bg)] px-3.5 text-[13px] font-medium text-[var(--octo-tone-danger-text)] hover:brightness-95">
                <Trash2 size={16} aria-hidden />
                {t("menuAi.editor.delete")}
              </button>
              <button type="button" onClick={() => onDuplicate(item)} className={clsx(tintedButton, "h-10 px-3.5")}>
                <Copy size={16} aria-hidden />
                {t("menuAi.editor.duplicate")}
              </button>
            </div>
          </>
        )}
        {tab === "allergens" && (
          <>
            <AllergensTab item={item} onChange={(allergens) => patch({ allergens })} />
            <div>
              <FieldLabel>{t("menuAi.editor.dietaryTags")}</FieldLabel>
              <TagEditor kind="dietary" values={item.dietary} onChange={(dietary) => patch({ dietary })} />
            </div>
          </>
        )}
        {tab === "modifiers" && <LaterTab title={t("menuAi.later.modifiersTitle")} body={t("menuAi.later.modifiersBody")} />}
        {tab === "nutrition" && <LaterTab title={t("menuAi.later.nutritionTitle")} body={t("menuAi.later.nutritionBody")} />}
        {tab === "advanced" && (
          <div className="space-y-3 text-[13px]">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-[var(--octo-text-secondary)]">{t("menuAi.advanced.id")}</dt>
              <dd className="truncate font-mono text-[12px] text-[var(--octo-text-primary)]">{item.id}</dd>
              <dt className="text-[var(--octo-text-secondary)]">{t("menuAi.advanced.rawConfidence")}</dt>
              <dd className="text-[var(--octo-text-primary)]"><ConfidencePill value={item.confidence} /></dd>
              <dt className="text-[var(--octo-text-secondary)]">{t("menuAi.advanced.flags")}</dt>
              <dd className="text-[var(--octo-text-primary)]">
                {item.issues.length === 0 ? t("menuAi.advanced.noFlags") : item.issues.map((k) => t(`menuAi.issue.${k}`)).join(", ")}
              </dd>
              <dt className="text-[var(--octo-text-secondary)]">{t("menuAi.advanced.onImport")}</dt>
              <dd className="text-[var(--octo-text-primary)]">
                {item.price === null ? t("menuAi.advanced.importDraft") : t("menuAi.advanced.importActive")}
              </dd>
            </dl>
            <label className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
              <span className="text-[var(--octo-text-primary)]">{t("menuAi.advanced.markReviewed")}</span>
              <input type="checkbox" checked={item.reviewed} onChange={(e) => patch({ reviewed: e.target.checked })} className="h-4 w-4 accent-[#3D1DF3]" />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
