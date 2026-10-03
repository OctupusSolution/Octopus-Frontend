// Screen 3 — "Edit Detected Items & Sections".
//
// Where the review screen confirms items one at a time, this one is for bulk
// correction: the sections on one side, the open section's items in a table,
// and the selected item's editor beside it. Edits in the editor apply as they
// are typed — there is no Save in this frame's panel — so the table always
// shows what will be imported.
import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
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
import {
  hasErrors,
  parsePrice,
  priceText,
  validateItemForm,
  type ItemField,
} from "@/entities/menu/ai-import-forms";
import { useI18n } from "@/app/providers/i18n-provider";
import { PopoverMenu, SelectBox, type PopoverItem } from "../_shared/controls";
import { MenuIcon } from "../_shared/menu-icon";
import {
  BIG_BUTTON,
  BIG_OUTLINE,
  ERROR_STRIP,
  FIELD_INVALID,
  LINE,
  PANEL,
  SURFACE_BLUE,
  SURFACE_SUBTLE,
  TEXT,
  TEXT_GRAY,
  TEXT_INPUT_CLASS,
  TEXT_SECONDARY,
} from "../_shared/theme";
import { fill } from "./ai-style";
import { BandPill, ConfidencePill, IMPORT_CARD, ImportFooter, ImportShell, StatTiles } from "./chrome";
import {
  AllergensTab,
  ConfidenceMeter,
  EditorTabs,
  ImageField,
  KebabMenu,
  LaterTab,
  PANEL_TEXTAREA,
  PanelField,
  PanelPriceInput,
  TagEditor,
  itemErrorText,
} from "./item-fields";
import { BulkPriceModal, ConfirmModal, FindReplaceModal, SectionNameModal, SummaryModal } from "./modals";
import { resetImport, sessionId, updateResult, useImportSession } from "./session-store";
import { useCommitImport } from "./use-commit";

/** Six rows a page, as the frame draws the table. */
const PAGE_SIZE = 6;
const EDIT_TABS = ["details", "modifiers", "allergens", "nutrition"] as const;
type EditTab = (typeof EDIT_TABS)[number];

/** Not in the frame, so not rendered — but kept, not removed: the per-row
 *  action menu, drag-to-reorder for items, A–Z section sort, the extraction
 *  summary, the item's Advanced tab, the Status select and the pager's
 *  arrows and "Showing x–y" line. */
const SHOW_UNFRAMED: boolean = false;

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

type SectionAction = "rename" | "up" | "down" | "delete";

const TABLE_GRID = "grid grid-cols-[minmax(0,1fr)_78px_66px_76px] items-center gap-x-2";
const TOOL_BUTTON = `${BIG_BUTTON} w-full gap-2`;

export function EditScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const session = useImportSession();
  const result = session.result as DetectionResult;
  const { commit } = useCommitImport();
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
  const [sectionMenu, setSectionMenu] = useState<{ anchor: DOMRect; section: DetectedSection; index: number } | null>(null);
  // The item whose editor a Next Step press found incomplete: its errors all
  // show at once. Any other item still opens clean.
  const [attemptedFor, setAttemptedFor] = useState<string | null>(null);

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

  function duplicate(item: DetectedItem) {
    const id = sessionId("ai-copy");
    let next = result;
    updateResult((r) => (next = duplicateDetectedItem(r, item.id, id)));
    selectItem(id, next);
  }

  /** The open item must be complete before the menu moves on. */
  function goNext() {
    if (selected) {
      const errors = validateItemForm({
        name: selected.item.name,
        priceText: priceText(selected.item.price),
        description: selected.item.description,
        image: selected.item.image,
        sectionId: selected.section.id,
      });
      if (hasErrors(errors)) {
        setAttemptedFor(selected.item.id);
        flash("error", t("menuAi.edit.fixOpenItem"));
        return;
      }
    }
    void commit("publish");
  }

  const csvPicker = useRef<HTMLInputElement>(null);

  const sectionActions = (index: number): PopoverItem<SectionAction>[] => [
    { id: "rename", label: t("menuAi.edit.rename") },
    ...(index > 0 ? [{ id: "up" as const, label: t("menuAi.edit.moveUp") }] : []),
    ...(index < result.sections.length - 1 ? [{ id: "down" as const, label: t("menuAi.edit.moveDown") }] : []),
    { id: "delete", label: t("menuAi.edit.deleteSection"), danger: true },
  ];

  return (
    <ImportShell
      step={3}
      title={t("menuAi.edit.title")}
      subtitle={t("menuAi.edit.subtitle")}
      onStep={(n) => setSearchParams(n === 1 ? {} : { step: "review" })}
      footer={
        <ImportFooter
          onCancel={() => {
            resetImport();
            navigate("/menu");
          }}
          onSaveDraft={() => void commit("draft")}
          onNext={goNext}
        />
      }
    >
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

      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-4">
          <StatTiles
            summary={summary}
            layout="inline"
            onNeedReview={
              summary.needReview > 0
                ? () => {
                    const first = result.sections.flatMap((s) => s.items).find(needsReview);
                    if (first) selectItem(first.id);
                  }
                : undefined
            }
          />
          {SHOW_UNFRAMED && (
            <button type="button" onClick={() => setModal({ kind: "summary" })} className="text-[14px] font-bold leading-[14px] text-[#0D6EFD] underline">
              {t("menuAi.edit.viewSummary")}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-[29px]">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
            <button type="button" data-open-find onClick={() => setModal({ kind: "find" })} className={clsx(TOOL_BUTTON, "border", LINE, TEXT, "hover:bg-[var(--octo-hover)]")}>
              <MenuIcon name="menu-search-replace.svg" size={24} />
              {t("menuAi.edit.findReplace")}
            </button>
            <button type="button" data-open-bulk onClick={() => setModal({ kind: "bulk" })} className={clsx(TOOL_BUTTON, SURFACE_BLUE, TEXT, "hover:brightness-95")}>
              <MenuIcon name="menu-price-cut.svg" size={24} />
              {t("menuAi.edit.bulkPrices")}
            </button>
            <button
              type="button"
              onClick={() => csvPicker.current?.click()}
              className={clsx(TOOL_BUTTON, SURFACE_BLUE, "text-[#0058da] hover:brightness-95 [[data-theme=dark]_&]:text-[#8ab8ff]")}
            >
              <MenuIcon name="menu-export.svg" size={24} />
              {t("menuAi.edit.importCsv")}
            </button>
          </div>

          {notice && (
            <p
              role="status"
              className={clsx(
                "-my-3 flex items-center justify-between gap-2 rounded-[12px] p-2 text-[12px] font-medium leading-[1.4]",
                notice.tone === "ok" ? "bg-[#dcffef] text-[#009a39] [[data-theme=dark]_&]:bg-[#009a39]/15" : ERROR_STRIP
              )}
            >
              {notice.text}
              <button type="button" onClick={() => setNotice(null)} className="font-bold underline">
                {t("menuAi.dismiss")}
              </button>
            </p>
          )}

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[293px_minmax(0,1fr)] 2xl:grid-cols-[293px_minmax(0,1fr)_301px] min-[1400px]:grid-cols-[293px_minmax(0,1fr)_301px]">
            {/* Sections */}
            <section className={clsx(PANEL, "flex flex-col gap-4")}>
              <div className={clsx("flex flex-col gap-3 border-b pb-2", LINE)}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>{t("menuAi.edit.sections")}</h2>
                  {SHOW_UNFRAMED && (
                    <button
                      type="button"
                      onClick={() => updateResult((r) => ({ ...r, sections: [...r.sections].sort((a, b) => a.name.localeCompare(b.name)) }))}
                      className="text-[12px] font-bold leading-3 text-[#0D6EFD] underline"
                    >
                      {t("menuAi.edit.sortSections")}
                    </button>
                  )}
                </div>
                <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SECONDARY)}>{t("menuAi.edit.sectionsHint")}</p>
              </div>
              <ul className="flex flex-col">
                {result.sections.map((s, index) => {
                  const active = s.id === section?.id;
                  const cover = s.items.find((i) => i.image)?.image ?? null;
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
                      className={clsx("flex items-center justify-between gap-2 border-t p-2 transition-colors", LINE, active && SURFACE_BLUE, dragSection === index && "opacity-50")}
                    >
                      <span className={clsx("grid size-6 shrink-0 cursor-grab place-items-center", TEXT)} aria-hidden>
                        <MenuIcon name="menu-drag.svg" size={12} />
                      </span>
                      <button type="button" data-section={s.name} onClick={() => openSection(s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                        <span className={clsx("grid size-12 shrink-0 place-items-center overflow-hidden rounded-[4px]", SURFACE_SUBTLE, TEXT_GRAY)}>
                          {cover ? <img src={cover} alt="" className="size-full object-cover" /> : <MenuIcon name="menu-food-24.svg" size={24} />}
                        </span>
                        <span className="flex min-w-0 flex-col gap-2 font-medium">
                          <span className={clsx("truncate text-[14px] leading-[14px]", TEXT)}>{s.name}</span>
                          <span className={clsx("text-[12px] leading-3", TEXT_GRAY)}>
                            {s.items.length === 1 ? t("menuAi.count.item1") : fill(t("menuAi.count.itemsN"), { n: s.items.length })}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-label={fill(t("menuAi.edit.sectionActions"), { name: s.name })}
                        onClick={(e) => setSectionMenu({ anchor: e.currentTarget.getBoundingClientRect(), section: s, index })}
                        className={clsx("grid size-6 shrink-0 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT)}
                      >
                        <MenuIcon name="menu-more-vertical-fill.svg" size={24} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setModal({ kind: "add-section" })}
                className={clsx("flex w-full items-center justify-center gap-3 rounded-[4px] border border-[#0D6EFD] p-2 text-[14px] font-semibold leading-[14px] text-[#0D6EFD] hover:brightness-95", SURFACE_BLUE)}
              >
                <MenuIcon name="menu-plus-thin.svg" size={24} />
                {t("menuAi.edit.addNewSection")}
              </button>
            </section>

            {/* Items table */}
            <section className={clsx(PANEL, "flex min-w-0 flex-col gap-6")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>
                  {section ? section.name : t("menuAi.edit.noSection")}{" "}
                  {section && (
                    <span className="text-[12px] font-normal leading-3">
                      ({items.length === 1 ? t("menuAi.count.item1") : fill(t("menuAi.count.itemsN"), { n: items.length })})
                    </span>
                  )}
                </h2>
                <div className="flex flex-wrap items-center justify-end gap-4">
                  {SHOW_UNFRAMED && (
                    <button type="button" aria-pressed={reorderMode} onClick={() => setReorderMode((m) => !m)} className="text-[14px] font-semibold leading-[14px] text-[#0D6EFD] underline">
                      {reorderMode ? t("menuAi.edit.doneReordering") : t("menuAi.edit.reorderItems")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!section}
                    onClick={() => section && setModal({ kind: "delete-section", section })}
                    className="flex h-9 items-center gap-1 rounded-[4px] bg-[#fef0f0] px-2 text-[14px] font-semibold leading-[14px] text-[#d30202] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 [[data-theme=dark]_&]:bg-[#d30202]/15"
                  >
                    <MenuIcon name="menu-trash.svg" size={24} />
                    {t("menuAi.edit.deleteSection")}
                  </button>
                  <button
                    type="button"
                    onClick={addItem}
                    className={clsx("flex h-9 items-center gap-1 rounded-[4px] border border-[#0D6EFD] px-2 text-[14px] font-semibold leading-[14px] text-[#0D6EFD] hover:brightness-95", SURFACE_BLUE)}
                  >
                    <MenuIcon name="menu-plus-thin.svg" size={24} />
                    {t("menuAi.edit.addItem")}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto octo-scroll">
                <div className="flex min-w-[440px] flex-col gap-2" role="table">
                  <div role="row" className={clsx(TABLE_GRID, "h-6 px-2 text-[12px] font-medium leading-3", SURFACE_SUBTLE, TEXT)}>
                    <span role="columnheader">{t("menuAi.edit.colItem")}</span>
                    <span role="columnheader">{t("menuAi.edit.colPriceShort")}</span>
                    <span role="columnheader">{t("menuAi.edit.colConfidence")}</span>
                    <span role="columnheader">{t("menuAi.edit.colStatus")}</span>
                  </div>
                  <div role="rowgroup" className="flex flex-col gap-4">
                    {visible.map((item, i) => {
                      const index = safePage * PAGE_SIZE + i;
                      const active = item.id === itemId;
                      return (
                        <div
                          key={item.id}
                          role="row"
                          tabIndex={0}
                          aria-selected={active}
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setItemId(item.id);
                            }
                          }}
                          className={clsx(
                            TABLE_GRID,
                            "cursor-pointer border-b pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                            i === visible.length - 1 ? "border-transparent" : LINE,
                            active && clsx("rounded-[4px]", SURFACE_BLUE),
                            dragItem === index && "opacity-50"
                          )}
                        >
                          <span role="cell" className="flex min-w-0 items-center gap-1">
                            <span className={clsx("size-12 shrink-0 overflow-hidden rounded-[4px]", SURFACE_SUBTLE)}>
                              {item.image && <img src={item.image} alt="" className="size-full object-cover" />}
                            </span>
                            <span className="flex min-w-0 flex-col gap-2 font-medium">
                              <span className={clsx("truncate text-[14px] leading-[14px]", TEXT)}>{item.name || "—"}</span>
                              <span className={clsx("truncate text-[12px] leading-3", TEXT_GRAY)}>{item.description}</span>
                            </span>
                          </span>
                          <span role="cell" className={clsx("whitespace-nowrap text-[14px] font-medium leading-[14px] tabular-nums", item.price === null ? "text-[#d30202]" : TEXT)}>
                            {item.price === null ? (
                              t("menuAi.paper.priceUnclear")
                            ) : (
                              <>
                                <span className="text-[12px] font-normal leading-3">{t("menuAi.bulk.currency")}</span> {item.price.toFixed(2)}
                              </>
                            )}
                          </span>
                          <span role="cell">
                            <ConfidencePill value={item.confidence} />
                          </span>
                          <span role="cell" className="flex items-center justify-between gap-1">
                            <BandPill band={bandFor(item.confidence)} reviewed={item.reviewed && item.confidence < 90} />
                            {SHOW_UNFRAMED && (
                              <KebabMenu
                                label={fill(t("menuAi.edit.itemActions"), { name: item.name })}
                                actions={[
                                  { label: t("menuAi.edit.editItem"), onSelect: () => setItemId(item.id) },
                                  { label: t("menuAi.edit.duplicate"), onSelect: () => duplicate(item) },
                                  item.reviewed
                                    ? { label: t("menuAi.edit.unmarkReviewed"), onSelect: () => updateResult((r) => updateDetectedItem(r, item.id, { reviewed: false })) }
                                    : { label: t("menuAi.edit.markReviewed"), onSelect: () => updateResult((r) => updateDetectedItem(r, item.id, { reviewed: true })) },
                                  { label: t("menuAi.edit.moveUp"), disabled: index === 0, onSelect: () => section && updateResult((r) => reorderItems(r, section.id, index, index - 1)) },
                                  { label: t("menuAi.edit.moveDown"), disabled: index === items.length - 1, onSelect: () => section && updateResult((r) => reorderItems(r, section.id, index, index + 1)) },
                                  { label: t("menuAi.editor.delete"), danger: true, onSelect: () => setModal({ kind: "delete-item", item }) },
                                ]}
                              />
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {section && items.length === 0 && (
                  <p className={clsx("px-2 py-8 text-center text-[14px] font-medium leading-[1.4]", TEXT_GRAY)}>{t("menuAi.edit.emptySection")}</p>
                )}
              </div>

              {pages > 1 && (
                <nav aria-label={t("menuAi.edit.pagination")} className="flex flex-wrap items-center justify-center">
                  {SHOW_UNFRAMED && (
                    <button type="button" aria-label={t("menuAi.review.prevPage")} disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className={clsx("grid size-8 place-items-center disabled:opacity-40", TEXT)}>
                      <MenuIcon name="menu-arrow-down.svg" size={18} className="rotate-90 rtl:-rotate-90" />
                    </button>
                  )}
                  {pageList(safePage, pages).map((p, i) =>
                    p === "gap" ? (
                      <span key={`gap-${i}`} className={clsx("grid size-8 place-items-center text-[12px] font-medium leading-3", TEXT)}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        aria-current={p === safePage ? "page" : undefined}
                        onClick={() => setPage(p)}
                        className={clsx(
                          "grid size-8 place-items-center text-[12px] font-medium leading-3 tabular-nums",
                          p === safePage ? "rounded-[8px] bg-[#0D6EFD] text-white" : clsx("rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT)
                        )}
                      >
                        {p + 1}
                      </button>
                    )
                  )}
                  {SHOW_UNFRAMED && (
                    <>
                      <button type="button" aria-label={t("menuAi.review.nextPage")} disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className={clsx("grid size-8 place-items-center disabled:opacity-40", TEXT)}>
                        <MenuIcon name="menu-arrow-down.svg" size={18} className="-rotate-90 rtl:rotate-90" />
                      </button>
                      <span className={clsx("ms-3 text-[12px] leading-3", TEXT_GRAY)}>
                        {fill(t("menuAi.edit.showing"), {
                          from: safePage * PAGE_SIZE + 1,
                          to: safePage * PAGE_SIZE + visible.length,
                          total: items.length,
                        })}
                      </span>
                    </>
                  )}
                </nav>
              )}
            </section>

            {/* Editor */}
            <aside className="min-w-0 lg:col-span-2 2xl:col-span-1 min-[1400px]:col-span-1">
              {selected ? (
                <TableEditor
                  key={selected.item.id}
                  item={selected.item}
                  sectionId={selected.section.id}
                  result={result}
                  attempted={attemptedFor === selected.item.id}
                  onSelect={(id) => selectItem(id)}
                  onDelete={(item) => setModal({ kind: "delete-item", item })}
                  onDuplicate={duplicate}
                />
              ) : (
                <div className={clsx(IMPORT_CARD, "flex min-h-[260px] flex-col items-center justify-center gap-2 px-6 text-center")}>
                  <p className={clsx("text-[14px] font-bold leading-[14px]", TEXT)}>{t("menuAi.editor.emptyTitle")}</p>
                  <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuAi.edit.emptyEditor")}</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <PopoverMenu
        anchor={sectionMenu?.anchor ?? null}
        items={sectionMenu ? sectionActions(sectionMenu.index) : []}
        onClose={() => setSectionMenu(null)}
        onPick={(action) => {
          if (!sectionMenu) return;
          const { section: target, index } = sectionMenu;
          setSectionMenu(null);
          if (action === "rename") setModal({ kind: "rename-section", section: target });
          else if (action === "delete") setModal({ kind: "delete-section", section: target });
          else updateResult((r) => reorderSections(r, index, action === "up" ? index - 1 : index + 1));
        }}
      />

      {/* Dialogs */}
      <SectionNameModal
        open={modal.kind === "add-section"}
        initial=""
        title={t("menuAi.edit.addNewSection")}
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
        onApply={(next, count) => {
          updateResult(() => next);
          setModal({ kind: "none" });
          flash("ok", fill(t("menuAi.bulk.doneN"), { n: count }));
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
    </ImportShell>
  );
}

function TableEditor({
  item,
  sectionId,
  result,
  attempted,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  item: DetectedItem;
  sectionId: string;
  result: DetectionResult;
  /** A Next Step press found this item incomplete: show every error. */
  attempted: boolean;
  onSelect: (id: string) => void;
  onDelete: (item: DetectedItem) => void;
  onDuplicate: (item: DetectedItem) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<EditTab | "advanced">("details");
  const [touched, setTouched] = useState<ReadonlySet<ItemField>>(new Set());
  // What is in the price box, kept so "abc" reads as "not a number" rather
  // than as "empty". `null` until the merchant types.
  const [typedPrice, setTypedPrice] = useState<string | null>(null);
  const patch = (p: Partial<DetectedItem>) => updateResult((r) => updateDetectedItem(r, item.id, p));
  const band = bandFor(item.confidence);

  const errors = useMemo(
    () =>
      validateItemForm({
        name: item.name,
        priceText: typedPrice ?? priceText(item.price),
        description: item.description,
        image: item.image,
        sectionId,
      }),
    [item.name, item.price, item.description, item.image, sectionId, typedPrice]
  );
  const shown = (field: ItemField) => (attempted || touched.has(field) ? itemErrorText(t, field, errors[field]) : null);
  const touch = (field: ItemField) => setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));

  return (
    <div className="flex flex-col gap-4">
      <section className={clsx(IMPORT_CARD, "flex flex-col gap-3")} aria-label={fill(t("menuAi.editor.editing"), { name: item.name })}>
        <h2 className={clsx("truncate text-[14px] font-bold leading-[14px]", TEXT)}>{fill(t("menuAi.editor.editing"), { name: item.name || "—" })}</h2>
        <EditorTabs tabs={SHOW_UNFRAMED ? ([...EDIT_TABS, "advanced"] as const) : EDIT_TABS} active={tab} onChange={setTab} />

        {tab === "details" && (
          <>
            <ImageField
              image={item.image}
              alt={item.name}
              error={shown("image")}
              onPick={(url) => patch({ image: url })}
              onRemove={() => patch({ image: null })}
              onTouched={() => touch("image")}
            />
            <PanelField label={t("menuAi.editor.name")} required htmlFor="ed-name" error={shown("name")}>
              <input
                id="ed-name"
                value={item.name}
                maxLength={80}
                aria-invalid={!!shown("name") || undefined}
                onBlur={() => touch("name")}
                onChange={(e) => patch({ name: e.target.value })}
                className={clsx(TEXT_INPUT_CLASS, shown("name") && FIELD_INVALID)}
              />
            </PanelField>
            <PanelField label={t("menuAi.editor.section")} required error={shown("section")}>
              <SelectBox
                value={sectionId}
                ariaLabel={t("menuAi.editor.section")}
                invalid={!!shown("section")}
                onBlur={() => touch("section")}
                onChange={(target) => {
                  let moved = result;
                  updateResult((r) => (moved = moveItemToSection(r, item.id, target)));
                  // Follow the item to where it went.
                  if (findItem(moved, item.id)) onSelect(item.id);
                }}
              >
                {result.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectBox>
            </PanelField>
            <PanelField label={t("menuAi.editor.priceLabel")} hint={t("menuAi.editor.priceUnit")} required htmlFor="ed-price" error={shown("price")}>
              <PanelPriceInput
                id="ed-price"
                value={item.price}
                invalid={!!shown("price")}
                onBlur={() => touch("price")}
                onText={(text) => {
                  setTypedPrice(text);
                  // Anything that is not a valid price is stored as "no price",
                  // the same state a detection uses for one it could not read.
                  patch({ price: parsePrice(text).value });
                }}
              />
            </PanelField>
            <PanelField label={t("menuAi.editor.description")} required htmlFor="ed-desc" error={shown("description")}>
              <textarea
                id="ed-desc"
                rows={3}
                maxLength={200}
                value={item.description}
                aria-invalid={!!shown("description") || undefined}
                onBlur={() => touch("description")}
                onChange={(e) => patch({ description: e.target.value })}
                className={clsx(PANEL_TEXTAREA, shown("description") && FIELD_INVALID)}
              />
            </PanelField>
            <ConfidenceMeter value={item.confidence} />
            {SHOW_UNFRAMED && (
              <PanelField label={t("menuAi.editor.status")}>
                <SelectBox value={item.reviewed ? "reviewed" : "auto"} ariaLabel={t("menuAi.editor.status")} onChange={(value) => patch({ reviewed: value === "reviewed" })}>
                  <option value="auto">{t(`menuAi.band.${band}`)}</option>
                  <option value="reviewed">{t("menuAi.status.reviewed")}</option>
                </SelectBox>
              </PanelField>
            )}
          </>
        )}
        {tab === "allergens" && (
          <>
            <AllergensTab item={item} onChange={(allergens) => patch({ allergens })} />
            <PanelField label={t("menuAi.editor.dietaryTags")} inset={false}>
              <TagEditor kind="dietary" values={item.dietary} onChange={(dietary) => patch({ dietary })} />
            </PanelField>
          </>
        )}
        {tab === "modifiers" && <LaterTab title={t("menuAi.later.modifiersTitle")} body={t("menuAi.later.modifiersBody")} />}
        {tab === "nutrition" && <LaterTab title={t("menuAi.later.nutritionTitle")} body={t("menuAi.later.nutritionBody")} />}
        {tab === "advanced" && (
          <dl className={clsx("grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12px] leading-[1.4]", TEXT)}>
            <dt className={TEXT_GRAY}>{t("menuAi.advanced.id")}</dt>
            <dd className="truncate font-mono">{item.id}</dd>
            <dt className={TEXT_GRAY}>{t("menuAi.advanced.flags")}</dt>
            <dd>{item.issues.length === 0 ? t("menuAi.advanced.noFlags") : item.issues.map((k) => t(`menuAi.issue.${k}`)).join(", ")}</dd>
            <dt className={TEXT_GRAY}>{t("menuAi.advanced.onImport")}</dt>
            <dd>{item.price === null ? t("menuAi.advanced.importDraft") : t("menuAi.advanced.importActive")}</dd>
          </dl>
        )}
      </section>

      <div className="flex flex-col gap-4">
        <button type="button" onClick={() => onDuplicate(item)} className={clsx(BIG_OUTLINE, "w-full")}>
          {t("menuAi.editor.duplicate")}
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className={clsx(BIG_BUTTON, "w-full gap-2 bg-[#fef0f0] text-[#d30202] hover:brightness-95 [[data-theme=dark]_&]:bg-[#d30202]/15")}
        >
          <MenuIcon name="menu-trash.svg" size={24} />
          {t("menuAi.editor.delete")}
        </button>
      </div>
    </div>
  );
}
