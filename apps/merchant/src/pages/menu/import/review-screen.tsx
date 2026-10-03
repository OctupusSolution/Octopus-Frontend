// Screen 2 — "Review& Edit Detected Menu".
//
// The paper is the navigation: the merchant reviews by clicking what they see,
// the way they would circle a mistake on a printout. Edits here are buffered
// and committed by "Save Item", because this screen is about confirming items
// one at a time — saving is the act of confirming, so it also marks the item
// reviewed. The table screen that follows edits live instead.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
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
import {
  hasErrors,
  parsePrice,
  priceText,
  validateItemForm,
  type ItemField,
} from "@/entities/menu/ai-import-forms";
import { useI18n } from "@/app/providers/i18n-provider";
import { SelectBox } from "../_shared/controls";
import { MenuIcon } from "../_shared/menu-icon";
import { BIG_BUTTON, BIG_PRIMARY, FIELD_INVALID, LINE, TEXT, TEXT_GRAY, TEXT_INPUT_CLASS } from "../_shared/theme";
import { fill } from "./ai-style";
import {
  ConfidencePill,
  IMPORT_CARD,
  IMPORT_FLOAT_CARD,
  ImportFooter,
  ImportShell,
  InfoStrip,
  PaperLegend,
  StatTiles,
} from "./chrome";
import {
  AllergensTab,
  ConfidenceMeter,
  EditorTabs,
  ImageField,
  LaterTab,
  PANEL_TEXTAREA,
  PanelField,
  PanelPriceInput,
  TagEditor,
  itemErrorText,
} from "./item-fields";
import { ConfirmModal, issueLine } from "./modals";
import { PaperMenu, sectionsOnPage } from "./paper-menu";
import { resetImport, updateResult, useImportSession } from "./session-store";
import { useCommitImport } from "./use-commit";

const REVIEW_TABS = ["details", "modifiers", "allergens", "nutrition"] as const;
type ReviewTab = (typeof REVIEW_TABS)[number];
const ZOOM_MIN = 60;
const ZOOM_MAX = 150;

/** The "Mapped Structure" view, the fullscreen toggle and the editor's
 *  prev / next / close buttons are not in the frame. Hidden, not removed. */
const SHOW_UNFRAMED: boolean = false;

interface Draft {
  name: string;
  priceText: string;
  description: string;
  allergens: string[];
  dietary: string[];
  image: string | null;
}
const draftOf = (i: DetectedItem): Draft => ({
  name: i.name,
  priceText: priceText(i.price),
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

const STEPPER_GROUP = `flex items-center overflow-hidden rounded-[4px] border ${LINE}`;
const STEPPER_BUTTON = `grid size-6 shrink-0 place-items-center bg-[#fbfafc] ${TEXT_GRAY} hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 [[data-theme=dark]_&]:bg-[var(--octo-track)] ${LINE}`;
const STEPPER_VALUE = `min-w-9 px-2 text-center text-[14px] leading-6 tabular-nums ${TEXT}`;

export function ReviewScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const session = useImportSession();
  const result = session.result as DetectionResult;
  const { commit } = useCommitImport();
  const summary = summarize(result);

  const initial = useMemo(() => {
    const fromUrl = params.get("item");
    if (fromUrl && findItem(result, fromUrl)) return fromUrl;
    return flatItems(result).find(needsReview)?.id ?? flatItems(result)[0]?.id ?? null;
    // Only on arrival; later selection is local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(initial);
  const [view] = useState<"preview" | "structure">("preview");
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

  return (
    <ImportShell
      step={2}
      title={t("menuAi.review.title")}
      subtitle={t("menuAi.review.subtitle")}
      onStep={() => setSearchParams({})}
      footer={
        <ImportFooter
          onCancel={() => {
            resetImport();
            navigate("/menu");
          }}
          onSaveDraft={() => void commit("draft")}
          onNext={() => setSearchParams({ step: "edit" })}
        />
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_367px]">
          <section
            ref={previewRef}
            className={clsx(IMPORT_FLOAT_CARD, "flex min-w-0 flex-col gap-6", expanded && "fixed inset-0 z-50 overflow-auto !rounded-none")}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SelectBox
                value={result.fileName}
                onChange={() => undefined}
                ariaLabel={t("menuAi.review.file")}
                className="!w-auto min-w-0 max-w-full [&_select]:px-3 [&_select]:pe-11"
              >
                <option value={result.fileName}>{result.fileName}</option>
              </SelectBox>
              <div className="flex items-center gap-3">
                <div className={STEPPER_GROUP}>
                  <button type="button" aria-label={t("menuAi.review.prevPage")} disabled={page === 0} onClick={() => setPage(page - 1)} className={clsx(STEPPER_BUTTON, "border-e")}>
                    <MenuIcon name="menu-arrow-down.svg" size={18} className="rotate-90 rtl:-rotate-90" />
                  </button>
                  <span dir="ltr" className={STEPPER_VALUE}>
                    {page + 1}/{result.pages}
                  </span>
                  <button type="button" aria-label={t("menuAi.review.nextPage")} disabled={page >= result.pages - 1} onClick={() => setPage(page + 1)} className={clsx(STEPPER_BUTTON, "border-s")}>
                    <MenuIcon name="menu-arrow-down.svg" size={18} className="-rotate-90 rtl:rotate-90" />
                  </button>
                </div>
                <div className={STEPPER_GROUP}>
                  <button type="button" aria-label={t("menuAi.review.zoomOut")} disabled={zoom <= ZOOM_MIN} onClick={() => setZoom(zoom - 10)} className={clsx(STEPPER_BUTTON, "border-e")}>
                    <MenuIcon name="menu-minus.svg" size={18} />
                  </button>
                  <span className={STEPPER_VALUE}>{zoom}%</span>
                  <button type="button" aria-label={t("menuAi.review.zoomIn")} disabled={zoom >= ZOOM_MAX} onClick={() => setZoom(zoom + 10)} className={clsx(STEPPER_BUTTON, "border-s")}>
                    <MenuIcon name="menu-plus-thin.svg" size={18} />
                  </button>
                </div>
                {SHOW_UNFRAMED && (
                  <button type="button" onClick={toggleFullscreen} className={clsx("rounded-[4px] border px-2 text-[12px] leading-6", LINE, TEXT)}>
                    {t("menuAi.review.fullscreen")}
                  </button>
                )}
              </div>
            </div>

            {view === "preview" ? (
              <div className="overflow-auto octo-scroll">
                {/* `zoom` rather than a transform: it reflows, so the scroll
                    area grows with the page instead of clipping it. */}
                <div style={{ zoom: zoom / 100 }}>
                  <PaperMenu result={result} columns={2} page={page} outlineSections selectedId={selectedId} onSelect={select} />
                </div>
              </div>
            ) : (
              <StructureTree result={result} selectedId={selectedId} onSelect={select} />
            )}

            <div className="flex flex-col gap-3">
              <PaperLegend />
              <InfoStrip className="!leading-3">{t("menuAi.legend.clickToEdit")}</InfoStrip>
            </div>
          </section>

          <aside className="min-w-0">
            {selected ? (
              <ReviewEditor key={selected.id} item={selected} result={result} onSelect={select} onClose={() => setSelectedId(null)} />
            ) : (
              <div className={clsx(IMPORT_CARD, "flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 text-center")}>
                <p className={clsx("text-[14px] font-bold leading-[14px]", TEXT)}>{t("menuAi.editor.emptyTitle")}</p>
                <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuAi.editor.emptyBody")}</p>
              </div>
            )}
          </aside>
        </div>

        <section className={clsx(IMPORT_CARD, "flex flex-col gap-4")}>
          <h2 className={clsx("text-[16px] font-bold leading-4", TEXT)}>{t("menuAi.review.detectionSummary")}</h2>
          <div className="flex flex-wrap items-center gap-4">
            <StatTiles
              summary={summary}
              layout="roomy"
              onNeedReview={
                summary.needReview > 0
                  ? () => {
                      const next = flatItems(result).find(needsReview);
                      if (next) select(next.id);
                    }
                  : undefined
              }
            />
            <AttentionList result={result} onPick={select} />
          </div>
        </section>
      </div>
    </ImportShell>
  );
}

/** The pale-red "Need Your Attention" box: one line per kind of open issue,
 *  each a shortcut to the first item that has it. */
export function AttentionList({ result, onPick }: { result: DetectionResult; onPick: (itemId: string) => void }) {
  const { t } = useI18n();
  const s = summarize(result);
  const kinds = ISSUE_KINDS.filter((k) => s.issues[k] > 0);
  return (
    <div className="flex flex-col items-start gap-2 rounded-[8px] bg-[#fef0f0] p-3 [[data-theme=dark]_&]:bg-[#d30202]/15">
      <h3 className="text-[14px] font-bold leading-[14px] text-[#d30202] [[data-theme=dark]_&]:text-[#ff6b6b]">{t("menuAi.attention.title")}</h3>
      {kinds.length === 0 ? (
        <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT)}>{t("menuAi.attention.none")}</p>
      ) : (
        kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            data-attention={kind}
            onClick={() => {
              const item = firstWithIssue(result, kind);
              if (item) onPick(item.id);
            }}
            className={clsx("flex items-start gap-1 text-start text-[14px] font-medium leading-[14px] hover:underline", TEXT)}
          >
            <MenuIcon name="menu-error-circle-solid.svg" size={16} className="text-[#d30202]" />
            {issueLine(t, kind, s.issues[kind])}
          </button>
        ))
      )}
    </div>
  );
}

/** Read-only: how the reader mapped the page onto sections and items. Not in
 *  the frame; reachable again by restoring the view switch. */
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
    <div className="px-1">
      <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuAi.review.structureHint")}</p>
      <ul className="mt-3 space-y-3" role="tree">
        <li role="treeitem" aria-expanded aria-selected={false} className={clsx("text-[14px] font-semibold", TEXT)}>
          {result.restaurant.name} — {result.fileName}
          <ul role="group" className={clsx("mt-2 space-y-3 border-s ps-4", LINE)}>
            {result.sections.map((section) => (
              <li key={section.id} role="treeitem" aria-expanded aria-selected={false}>
                <p className={clsx("flex items-center gap-2 text-[14px] font-semibold", TEXT)}>
                  {section.name}
                  <span className={clsx("text-[12px] font-medium", TEXT_GRAY)}>{section.items.length}</span>
                </p>
                <ul role="group" className={clsx("mt-1 border-s ps-3", LINE)}>
                  {section.items.map((item) => (
                    <li key={item.id} role="treeitem" aria-selected={selectedId === item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className={clsx(
                          "flex w-full items-center justify-between gap-3 rounded-[4px] px-2 py-1 text-start text-[14px] font-normal hover:bg-[var(--octo-hover)]",
                          selectedId === item.id && "bg-[#f5f9ff] text-[#0D6EFD] [[data-theme=dark]_&]:bg-[#0d6efd]/15"
                        )}
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className={clsx("tabular-nums", TEXT_GRAY)}>
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
  const [draft, setDraft] = useState<Draft>(() => draftOf(item));
  const [touched, setTouched] = useState<ReadonlySet<ItemField>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  // A save from elsewhere (bulk edit on the next screen) re-seeds the buffer.
  useEffect(() => setDraft(draftOf(item)), [item]);

  const errors = validateItemForm(draft);
  const shown = (field: ItemField) => (attempted || touched.has(field) ? itemErrorText(t, field, errors[field]) : null);
  const touch = (field: ItemField) => setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  function patch(p: Partial<Draft>) {
    setSaved(false);
    setDraft((d) => ({ ...d, ...p }));
  }

  function save() {
    if (hasErrors(errors)) {
      // Reveal every error, where the merchant can see it.
      setAttempted(true);
      setTab("details");
      return;
    }
    updateResult((r) =>
      updateDetectedItem(r, item.id, {
        name: draft.name.trim(),
        price: parsePrice(draft.priceText).value,
        description: draft.description,
        allergens: draft.allergens,
        dietary: draft.dietary,
        image: draft.image,
        reviewed: true,
      })
    );
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={clsx(IMPORT_CARD, "flex flex-col gap-3")} aria-label={fill(t("menuAi.editor.editing"), { name: item.name })}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={clsx("min-w-0 truncate text-[14px] font-bold leading-[14px]", TEXT)}>
            {fill(t("menuAi.editor.editing"), { name: item.name })}
          </h2>
          {SHOW_UNFRAMED && (
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
                    className={clsx("grid size-6 place-items-center rounded-[4px] border disabled:opacity-40", LINE, TEXT_GRAY)}
                  >
                    <MenuIcon name="menu-arrow-down.svg" size={18} className={step === -1 ? "rotate-90 rtl:-rotate-90" : "-rotate-90 rtl:rotate-90"} />
                  </button>
                );
              })}
              <button type="button" onClick={onClose} className={clsx("rounded-[4px] border px-2 text-[12px] leading-6", LINE, TEXT_GRAY)}>
                {t("menuAi.editor.close")}
              </button>
            </div>
          )}
        </div>
        <EditorTabs tabs={REVIEW_TABS} active={tab} onChange={setTab} />

        {tab === "details" && (
          <>
            <ImageField
              image={draft.image}
              alt={draft.name}
              error={shown("image")}
              onPick={(url) => patch({ image: url })}
              onRemove={() => patch({ image: null })}
              onTouched={() => touch("image")}
            />
            <PanelField label={t("menuAi.editor.name")} required htmlFor="rv-name" error={shown("name")}>
              <input
                id="rv-name"
                value={draft.name}
                maxLength={80}
                aria-invalid={!!shown("name") || undefined}
                onBlur={() => touch("name")}
                onChange={(e) => patch({ name: e.target.value })}
                className={clsx(TEXT_INPUT_CLASS, shown("name") && FIELD_INVALID)}
              />
            </PanelField>
            <PanelField label={t("menuAi.editor.priceLabel")} hint={t("menuAi.editor.priceUnit")} required htmlFor="rv-price" error={shown("price")}>
              <PanelPriceInput
                id="rv-price"
                value={item.price}
                invalid={!!shown("price")}
                onBlur={() => touch("price")}
                onText={(text) => patch({ priceText: text })}
              />
            </PanelField>
            <PanelField label={t("menuAi.editor.description")} required htmlFor="rv-desc" error={shown("description")}>
              <textarea
                id="rv-desc"
                rows={2}
                maxLength={200}
                value={draft.description}
                aria-invalid={!!shown("description") || undefined}
                onBlur={() => touch("description")}
                onChange={(e) => patch({ description: e.target.value })}
                className={clsx(PANEL_TEXTAREA, shown("description") && FIELD_INVALID)}
              />
            </PanelField>
            <PanelField label={t("menuAi.editor.allergyTags")} inset={false}>
              <TagEditor kind="allergen" values={draft.allergens} onChange={(allergens) => patch({ allergens })} />
            </PanelField>
            <PanelField label={t("menuAi.editor.dietaryTags")} inset={false}>
              <TagEditor kind="dietary" values={draft.dietary} onChange={(dietary) => patch({ dietary })} />
            </PanelField>
            <ConfidenceMeter value={item.confidence} />
          </>
        )}
        {tab === "allergens" && <AllergensTab item={draft} onChange={(allergens) => patch({ allergens })} />}
        {tab === "modifiers" && <LaterTab title={t("menuAi.later.modifiersTitle")} body={t("menuAi.later.modifiersBody")} />}
        {tab === "nutrition" && <LaterTab title={t("menuAi.later.nutritionTitle")} body={t("menuAi.later.nutritionBody")} />}
      </section>

      <div className="flex flex-col gap-4">
        <button type="button" data-save-item onClick={save} className={clsx(BIG_PRIMARY, "w-full")}>
          {t("menuAi.editor.saveItem")}
        </button>
        {saved && (
          <span role="status" className="-mt-2 text-center text-[12px] font-medium leading-3 text-[#009a39]">
            {t("menuAi.editor.saved")}
          </span>
        )}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className={clsx(BIG_BUTTON, "w-full gap-2 bg-[#fef0f0] text-[#d30202] hover:brightness-95 [[data-theme=dark]_&]:bg-[#d30202]/15")}
        >
          <MenuIcon name="menu-trash.svg" size={24} />
          {t("menuAi.editor.delete")}
        </button>
      </div>

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
    </div>
  );
}
