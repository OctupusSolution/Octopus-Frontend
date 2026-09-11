// Screen 2 — "Review & Edit Detected Menu".
//
// The paper is the navigation: the merchant reviews by clicking what they see,
// the way they would circle a mistake on a printout. Edits here are buffered
// and committed by "Save Changes", because this screen is about confirming
// items one at a time — saving is the act of confirming, so it also marks the
// item reviewed. The table screen that follows edits live instead.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListChecks,
  ListTree,
  Maximize,
  Minimize,
  Minus,
  MousePointerClick,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  ISSUE_KINDS,
  findItem,
  firstWithIssue,
  flatItems,
  needsReview,
  removeDetectedItem,
  siblingItem,
  summarize,
  updateDetectedItem,
  type DetectedItem,
  type DetectionResult,
} from "@/entities/menu/ai-import";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { useI18n } from "@/app/providers/i18n-provider";
import { AI, card, fill } from "./ai-style";
import { Breadcrumb, ConfidencePill, LegendSwatch, NextButton, PageTitle, SaveDraftButton, StatIcon } from "./chrome";
import {
  AllergensTab,
  ConfidenceMeter,
  EditorTabs,
  FieldLabel,
  IssueNotes,
  LaterTab,
  PriceInput,
  TagEditor,
  inputClass,
} from "./item-fields";
import { ConfirmModal, issueLine } from "./modals";
import { PaperMenu, sectionsOnPage } from "./paper-menu";
import { updateResult, useImportSession } from "./session-store";
import { useCommitImport } from "./use-commit";

const REVIEW_TABS = ["details", "modifiers", "allergens", "nutrition"] as const;
type ReviewTab = (typeof REVIEW_TABS)[number];
const ZOOM_MIN = 60;
const ZOOM_MAX = 150;

type Editable = Pick<DetectedItem, "name" | "price" | "description" | "allergens" | "dietary" | "image">;
const pickEditable = (i: DetectedItem): Editable => ({
  name: i.name,
  price: i.price,
  description: i.description,
  allergens: i.allergens,
  dietary: i.dietary,
  image: i.image,
});

function pageOf(result: DetectionResult, itemId: string): number {
  const found = findItem(result, itemId);
  if (!found) return 0;
  for (let p = 0; p < result.pages; p++) {
    if (sectionsOnPage(result, p).some((s) => s.id === found.section.id)) return p;
  }
  return 0;
}

export function ReviewScreen() {
  const { t } = useI18n();
  const [params, setSearchParams] = useSearchParams();
  const session = useImportSession();
  const result = session.result as DetectionResult;
  const { ready, commit } = useCommitImport();
  const summary = summarize(result);

  const initial = useMemo(() => {
    const fromUrl = params.get("item");
    if (fromUrl && findItem(result, fromUrl)) return fromUrl;
    return flatItems(result).find(needsReview)?.id ?? flatItems(result)[0]?.id ?? null;
    // Only on arrival; later selection is local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(initial);
  const [view, setView] = useState<"preview" | "structure">("preview");
  const [page, setPage] = useState(() => (initial ? pageOf(result, initial) : 0));
  const [zoom, setZoom] = useState(100);
  const [expanded, setExpanded] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const selected = selectedId ? findItem(result, selectedId)?.item ?? null : null;

  function select(itemId: string) {
    setSelectedId(itemId);
    setPage(pageOf(result, itemId));
  }

  // Keep the native fullscreen state and ours in step (Esc exits natively).
  useEffect(() => {
    const onChange = () => setExpanded(document.fullscreenElement === previewRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    const el = previewRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => setExpanded((e) => !e));
    else setExpanded((e) => !e);
  }

  const toolbarButton =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-[6px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <Breadcrumb
        current={t("menuAi.crumb.review")}
        trail={[{ label: t("menuAi.crumb.upload"), to: "/menu/import" }]}
      />
      <PageTitle
        variant="badge"
        title={t("menuAi.review.title")}
        subtitle={t("menuAi.review.subtitle")}
        actions={
          <>
            <SaveDraftButton onClick={() => commit("draft")} disabled={!ready} />
            <NextButton label={t("menuAi.review.next")} onClick={() => setSearchParams({ step: "edit" })} />
          </>
        }
      />

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)]">
        <div className="min-w-0 space-y-4">
          <section className={clsx(card, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-2">
              <div role="tablist" className="flex">
                {(["preview", "structure"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={clsx(
                      "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-[13.5px] font-medium",
                      view === v ? clsx(AI.border, AI.text) : "border-transparent text-[var(--octo-text-secondary)]"
                    )}
                  >
                    {v === "preview" ? <LayoutGrid size={17} aria-hidden /> : <ListTree size={17} aria-hidden />}
                    {v === "preview" ? (
                      <span>
                        {t("menuAi.review.tabPreview")}{" "}
                        <span className="font-normal">{t("menuAi.review.tabPreviewHint")}</span>
                      </span>
                    ) : (
                      t("menuAi.review.tabStructure")
                    )}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 py-2">
                <button
                  type="button"
                  disabled={summary.needReview === 0}
                  onClick={() => {
                    const next = flatItems(result).find(needsReview);
                    if (next) select(next.id);
                  }}
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--octo-warning-bg)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--octo-tone-warning-text)] hover:brightness-95 disabled:cursor-default"
                >
                  <AlertTriangle size={15} aria-hidden />
                  {fill(t("menuAi.review.needReviewChip"), { n: summary.needReview })}
                </button>
                <span className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--octo-tone-success-bg)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--octo-text-primary)]">
                  <ShieldCheck size={15} className="text-[var(--octo-tone-success-text)]" aria-hidden />
                  {fill(t("menuAi.review.detectedChip"), { n: summary.items })}
                </span>
              </div>
            </div>

            {view === "preview" ? (
              <div
                ref={previewRef}
                className={clsx(
                  "border-t border-[var(--octo-border-card)] bg-[var(--octo-card)]",
                  expanded && "fixed inset-0 z-50 overflow-auto"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--octo-track)] px-3 py-2">
                  <select
                    aria-label={t("menuAi.review.file")}
                    value={result.fileName}
                    onChange={() => undefined}
                    className="h-8 max-w-[240px] truncate rounded-[6px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 text-[12.5px] text-[var(--octo-text-primary)]"
                  >
                    <option>{result.fileName}</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={t("menuAi.review.prevPage")} disabled={page === 0} onClick={() => setPage(page - 1)} className={toolbarButton}>
                      <ChevronLeft size={15} className="rtl:rotate-180" aria-hidden />
                    </button>
                    <span dir="ltr" className="min-w-[48px] text-center text-[12.5px] tabular-nums text-[var(--octo-text-primary)]">
                      {page + 1} / {result.pages}
                    </span>
                    <button type="button" aria-label={t("menuAi.review.nextPage")} disabled={page >= result.pages - 1} onClick={() => setPage(page + 1)} className={toolbarButton}>
                      <ChevronRight size={15} className="rtl:rotate-180" aria-hidden />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={t("menuAi.review.zoomOut")} disabled={zoom <= ZOOM_MIN} onClick={() => setZoom(zoom - 10)} className={toolbarButton}>
                      <Minus size={15} aria-hidden />
                    </button>
                    <span className="min-w-[48px] text-center text-[12.5px] tabular-nums text-[var(--octo-text-primary)]">{zoom}%</span>
                    <button type="button" aria-label={t("menuAi.review.zoomIn")} disabled={zoom >= ZOOM_MAX} onClick={() => setZoom(zoom + 10)} className={toolbarButton}>
                      <Plus size={15} aria-hidden />
                    </button>
                    <button type="button" aria-label={t("menuAi.review.fullscreen")} onClick={toggleFullscreen} className={clsx(toolbarButton, "ms-2")}>
                      {expanded ? <Minimize size={15} aria-hidden /> : <Maximize size={15} aria-hidden />}
                    </button>
                  </div>
                </div>
                <div className="overflow-auto octo-scroll">
                  {/* `zoom` rather than a transform: it reflows, so the scroll
                      area grows with the page instead of clipping it. */}
                  <div style={{ zoom: zoom / 100 }}>
                    <PaperMenu
                      className="rounded-none"
                      result={result}
                      columns={3}
                      page={page}
                      selectedId={selectedId}
                      onSelect={select}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
                  <LegendSwatch className="border-[var(--octo-tone-success-border)]" label={t("menuAi.legend.highPct")} />
                  <LegendSwatch className="border-[var(--octo-tone-warning-border)]" label={t("menuAi.legend.mediumPct")} />
                  <LegendSwatch className="border-[rgb(239_68_68/0.4)]" label={t("menuAi.legend.lowPct")} />
                  <span className={clsx("inline-flex items-center gap-2 text-[12px]", AI.text)}>
                    <MousePointerClick size={15} aria-hidden />
                    {t("menuAi.legend.click")}
                  </span>
                </div>
              </div>
            ) : (
              <StructureTree result={result} selectedId={selectedId} onSelect={select} />
            )}
          </section>

          <section className={clsx("grid grid-cols-1 gap-4 rounded-[14px] border p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]", AI.soft, AI.softBorder)}>
            <div>
              <h2 className={clsx("text-[13.5px] font-semibold", AI.text)}>{t("menuAi.review.detectionSummary")}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { tone: "violet" as const, icon: <LayoutGrid size={17} />, v: summary.sections, l: t("menuAi.stat.sectionsDetected") },
                  { tone: "violet" as const, icon: <ListChecks size={17} />, v: summary.items, l: t("menuAi.stat.itemsDetected") },
                  { tone: "success" as const, icon: <ShieldCheck size={17} />, v: summary.high, l: t("menuAi.stat.highBand") },
                  { tone: "warning" as const, icon: <AlertTriangle size={17} />, v: summary.needReview, l: t("menuAi.stat.reviewBand") },
                ].map((s) => (
                  <div key={s.l} className="flex items-start gap-2.5">
                    <StatIcon tone={s.tone} size={34}>{s.icon}</StatIcon>
                    <div>
                      <p className="text-[20px] font-bold leading-tight tabular-nums text-[var(--octo-text-primary)]">{s.v}</p>
                      <p className="text-[12px] leading-snug text-[var(--octo-text-secondary)]">{s.l}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <AttentionList result={result} onPick={select} />
          </section>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          {selected ? (
            <ReviewEditor
              key={selected.id}
              item={selected}
              result={result}
              onSelect={select}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className={clsx(card, "flex min-h-[320px] flex-col items-center justify-center px-6 text-center")}>
              <MousePointerClick size={30} className={AI.text} aria-hidden />
              <p className="mt-3 text-[14px] font-medium text-[var(--octo-text-primary)]">{t("menuAi.editor.emptyTitle")}</p>
              <p className="mt-1 text-[12.5px] text-[var(--octo-text-secondary)]">{t("menuAi.editor.emptyBody")}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function AttentionList({ result, onPick }: { result: DetectionResult; onPick: (itemId: string) => void }) {
  const { t } = useI18n();
  const s = summarize(result);
  const kinds = ISSUE_KINDS.filter((k) => s.issues[k] > 0);
  return (
    <div className="lg:border-s lg:border-[var(--octo-ai-border)] lg:ps-4">
      <h2 className={clsx("text-[13.5px] font-semibold", AI.text)}>{t("menuAi.attention.title")}</h2>
      {kinds.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--octo-tone-success-text)]">{t("menuAi.attention.none")}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {kinds.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                data-attention={kind}
                onClick={() => {
                  const item = firstWithIssue(result, kind);
                  if (item) onPick(item.id);
                }}
                className="inline-flex items-center gap-2 text-start text-[13px] text-[var(--octo-text-primary)] hover:underline"
              >
                <AlertTriangle size={15} className="shrink-0 text-[var(--octo-tone-warning-dot)]" aria-hidden />
                {issueLine(t, kind, s.issues[kind])}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Read-only: how the reader mapped the page onto sections and items. */
function StructureTree({
  result,
  selectedId,
  onSelect,
}: {
  result: DetectionResult;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="border-t border-[var(--octo-border-card)] px-4 py-3">
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("menuAi.review.structureHint")}</p>
      <ul className="mt-3 space-y-3" role="tree">
        <li role="treeitem" aria-expanded className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
          {result.restaurant.name} — {result.fileName}
          <ul role="group" className="mt-2 space-y-3 border-s border-[var(--octo-border-card)] ps-4">
            {result.sections.map((section) => (
              <li key={section.id} role="treeitem" aria-expanded>
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--octo-text-primary)]">
                  {section.name}
                  <span className="rounded-[5px] bg-[var(--octo-track)] px-1.5 text-[11.5px] font-medium text-[var(--octo-text-secondary)]">
                    {section.items.length}
                  </span>
                </p>
                <ul role="group" className="mt-1 border-s border-[var(--octo-border-card)] ps-3">
                  {section.items.map((item) => (
                    <li key={item.id} role="treeitem" aria-selected={selectedId === item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className={clsx(
                          "flex w-full items-center justify-between gap-3 rounded-[6px] px-2 py-1 text-start text-[13px] font-normal hover:bg-[var(--octo-hover)]",
                          selectedId === item.id && clsx(AI.soft, AI.text)
                        )}
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="tabular-nums text-[var(--octo-text-secondary)]">
                            {item.price === null ? t("menuAi.paper.priceUnclear") : `SAR ${item.price}`}
                          </span>
                          <ConfidencePill value={item.confidence} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}

function ReviewEditor({
  item,
  result,
  onSelect,
  onClose,
}: {
  item: DetectedItem;
  result: DetectionResult;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<ReviewTab>("details");
  const [draft, setDraft] = useState<Editable>(() => pickEditable(item));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const picker = useFilePicker((url) => patch({ image: url }));

  // A save from elsewhere (bulk edit on the next screen) re-seeds the buffer.
  useEffect(() => setDraft(pickEditable(item)), [item]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(pickEditable(item));
  const nameMissing = draft.name.trim() === "";
  function patch(p: Partial<Editable>) {
    setSaved(false);
    setDraft((d) => ({ ...d, ...p }));
  }
  // What the notes box and meter judge: the item as it would be once saved.
  const preview: DetectedItem = { ...item, ...draft };

  return (
    <section className={clsx(card, "flex flex-col")} aria-label={fill(t("menuAi.editor.editing"), { name: item.name })}>
      {picker.input}
      <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
        <h2 className="min-w-0 truncate text-[15px] text-[var(--octo-text-secondary)]">
          {t("menuAi.editor.editingLabel")} <b className="font-semibold text-[var(--octo-text-primary)]">{item.name}</b>
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {([-1, 1] as const).map((step) => {
            const sib = siblingItem(result, item.id, step);
            return (
              <button
                key={step}
                type="button"
                aria-label={step === -1 ? t("menuAi.editor.prev") : t("menuAi.editor.next")}
                disabled={!sib}
                onClick={() => sib && onSelect(sib.id)}
                className="rounded-[6px] border border-[var(--octo-border-input)] p-1 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] disabled:opacity-40"
              >
                {step === -1 ? <ChevronLeft size={15} className="rtl:rotate-180" aria-hidden /> : <ChevronRight size={15} className="rtl:rotate-180" aria-hidden />}
              </button>
            );
          })}
          <button type="button" aria-label={t("menuAi.editor.close")} onClick={onClose} className="rounded-[6px] border border-[var(--octo-border-input)] p-1 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]">
            <X size={15} aria-hidden />
          </button>
        </div>
      </header>
      <div className="px-2">
        <EditorTabs tabs={REVIEW_TABS} active={tab} onChange={setTab} />
      </div>

      <div className="space-y-4 px-4 py-4">
        {tab === "details" && (
          <>
            <div>
              <FieldLabel required htmlFor="rv-name">{t("menuAi.editor.name")}</FieldLabel>
              <input id="rv-name" value={draft.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} className={inputClass} />
              {nameMissing && <p className="mt-1 text-[12px] text-[var(--octo-tone-danger-text)]">{t("menuAi.editor.nameRequired")}</p>}
            </div>
            <div>
              <FieldLabel required htmlFor="rv-price">{t("menuAi.editor.price")}</FieldLabel>
              <PriceInput id="rv-price" value={draft.price} onChange={(price) => patch({ price })} />
            </div>
            <div>
              <FieldLabel required htmlFor="rv-desc">{t("menuAi.editor.description")}</FieldLabel>
              <textarea id="rv-desc" rows={3} maxLength={200} value={draft.description} onChange={(e) => patch({ description: e.target.value })} className={clsx(inputClass, "resize-none")} />
              <p className="mt-0.5 text-end text-[11.5px] tabular-nums text-[var(--octo-text-muted)]">{draft.description.length} / 200</p>
            </div>
            <div>
              <FieldLabel>{t("menuAi.editor.allergyTags")}</FieldLabel>
              <TagEditor kind="allergen" values={draft.allergens} onChange={(allergens) => patch({ allergens })} />
            </div>
            <div>
              <FieldLabel>{t("menuAi.editor.dietaryTags")}</FieldLabel>
              <TagEditor kind="dietary" values={draft.dietary} onChange={(dietary) => patch({ dietary })} />
            </div>
            <div>
              <FieldLabel>{t("menuAi.editor.imageOptional")}</FieldLabel>
              <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3">
                <div className="relative h-[100px] overflow-hidden rounded-[8px] bg-[var(--octo-track)]">
                  {draft.image ? (
                    <>
                      <img src={draft.image} alt={draft.name} className="h-full w-full object-cover" />
                      <button type="button" aria-label={t("menuAi.editor.removeImage")} onClick={() => patch({ image: null })} className="absolute end-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white hover:bg-black/70">
                        <X size={13} aria-hidden />
                      </button>
                    </>
                  ) : (
                    <span className="flex h-full items-center justify-center text-[12px] text-[var(--octo-text-muted)]">{t("menuAi.editor.noImage")}</span>
                  )}
                </div>
                <button type="button" onClick={picker.open} className={clsx("flex h-[100px] flex-col items-center justify-center rounded-[8px] border text-center", AI.softBorder, "bg-[var(--octo-soft-bg)] hover:brightness-95")}>
                  <Plus size={16} className={AI.text} aria-hidden />
                  <span className={clsx("text-[12.5px] font-semibold", AI.text)}>{draft.image ? t("menuAi.editor.replaceImage") : t("menuAi.editor.addImage")}</span>
                  <span className="text-[11px] text-[var(--octo-text-muted)]">{t("menuAi.editor.imageLimits")}</span>
                </button>
              </div>
              {picker.error && <p role="alert" className="mt-1 text-[12px] text-[var(--octo-tone-danger-text)]">{t(`menuAi.imageError.${picker.error}`)}</p>}
            </div>
            <ConfidenceMeter value={item.confidence} variant="review" />
            <IssueNotes item={preview} variant="review" />
          </>
        )}
        {tab === "allergens" && (
          <AllergensTab item={preview} onChange={(allergens) => patch({ allergens })} />
        )}
        {tab === "modifiers" && <LaterTab title={t("menuAi.later.modifiersTitle")} body={t("menuAi.later.modifiersBody")} />}
        {tab === "nutrition" && <LaterTab title={t("menuAi.later.nutritionTitle")} body={t("menuAi.later.nutritionBody")} />}
      </div>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)] px-4 py-3">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex h-10 items-center gap-2 rounded-[8px] px-2 text-[13.5px] font-medium text-[var(--octo-tone-danger-text)] hover:bg-[var(--octo-tone-danger-bg)]"
        >
          <Trash2 size={17} aria-hidden />
          {t("menuAi.editor.delete")}
        </button>
        <div className="flex items-center gap-2">
          {saved && !dirty && (
            <span role="status" className="text-[12.5px] text-[var(--octo-tone-success-text)]">{t("menuAi.editor.saved")}</span>
          )}
          <button
            type="button"
            data-save-item
            disabled={nameMissing || (!dirty && !needsReview(item))}
            onClick={() => {
              updateResult((r) => updateDetectedItem(r, item.id, { ...draft, name: draft.name.trim(), reviewed: true }));
              setSaved(true);
            }}
            className={clsx("inline-flex h-10 items-center rounded-[8px] px-5 text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50", AI.solid)}
          >
            {needsReview(item) && !dirty ? t("menuAi.editor.confirm") : t("menuAi.editor.save")}
          </button>
        </div>
      </footer>

      <ConfirmModal
        open={confirmDelete}
        title={t("menuAi.confirmDeleteItem.title")}
        body={fill(t("menuAi.confirmDeleteItem.body"), { name: item.name })}
        confirmLabel={t("menuAi.editor.delete")}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          const next = siblingItem(result, item.id, 1) ?? siblingItem(result, item.id, -1);
          updateResult((r) => removeDetectedItem(r, item.id));
          if (next) onSelect(next.id);
          else onClose();
        }}
      />
    </section>
  );
}
