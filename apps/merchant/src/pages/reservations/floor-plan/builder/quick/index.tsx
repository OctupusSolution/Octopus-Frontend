// Quick Box Layout: Add Tables → Arrange Tables → Review & Publish.
//
// The wizard edits the business's one draft. With no draft it starts from a
// copy of the live plan (so new tables are added to the floor that exists,
// numbered after it), or from an empty floor when nothing is live yet. Nothing
// is written until the merchant actually changes something.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket } from "lucide-react";
import { addQuickTables, emptyDoc, type FloorPlanDoc, type FloorTable, type LiveStatus, type QuickStep, type WriteOutcome } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { PageHeader, PageShell } from "../../_shared/page-header";
import { FLOOR_PLAN_BUILDER_PATH, LIVE_FLOOR_PLAN_PATH, SCRATCH_PATH } from "../../_shared/paths";
import { ToastBanner, useToast } from "../../_shared/toast";
import { useAdminText } from "../../_shared/admin-text";
import { useBuilderStep, useFloorPlan, useLiveTables } from "../../_shared/use-floor-plan";
import { DEFAULT_VIEW, type ViewOptions } from "../_shared/canvas-toolbar";
import { EditLockNotice, useEditLock } from "../_shared/edit-lock";
import { PlanReview, PublishConfirmModal, PublishSuccessModal } from "../_shared/publish-flow";
import { StepBadge, StepProgress } from "../_shared/step-progress";
import { useAutosave, usePlanEditor } from "../_shared/use-plan-editor";
import { AddTablesStep } from "./add-tables-step";
import { ArrangeStep } from "./arrange-step";

export function useBuilderTones(publishedDoc: FloorPlanDoc | null) {
  const live = useLiveTables(publishedDoc);
  const publishedIds = useMemo(() => new Set(publishedDoc?.tables.map((table) => table.id) ?? []), [publishedDoc]);
  // Tables already on the live floor show what is happening at them; tables
  // added in this draft are not live yet, so they read as available.
  return useCallback(
    (table: FloorTable): LiveStatus => {
      if (table.blocked) return "blocked";
      if (!publishedIds.has(table.id)) return "available";
      return live.byId.get(table.id)?.state.status ?? "available";
    },
    [publishedIds, live.byId]
  );
}

export function QuickBoxLayoutPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const floorPlan = useFloorPlan();
  const { toast, notify } = useToast();
  const topRef = useRef<HTMLDivElement>(null);

  const [boot] = useState(() => {
    const { draft, published } = floorPlan;
    if (draft) {
      const step: QuickStep = draft.method === "quick" ? draft.step : draft.doc.tables.length > 0 ? 2 : 1;
      return { doc: draft.doc, step, fromPublished: draft.fromPublished, hadDraft: true };
    }
    if (published) return { doc: structuredClone(published.doc), step: 1 as QuickStep, fromPublished: true, hadDraft: false };
    return { doc: emptyDoc(t("floorPlan.defaults.planName")), step: 1 as QuickStep, fromPublished: false, hadDraft: false };
  });

  const [step, setStep] = useState<QuickStep>(boot.step);
  const at = useAdminText();
  const lock = useEditLock();
  useBuilderStep(step);
  const [furthest, setFurthest] = useState<QuickStep>(boot.step === 1 && boot.doc.tables.length > 0 && boot.hadDraft ? 2 : boot.step);
  const [stepRevision, setStepRevision] = useState(0);
  const [view, setView] = useState<ViewOptions>(DEFAULT_VIEW);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successDoc, setSuccessDoc] = useState<FloorPlanDoc | null>(null);

  const editor = usePlanEditor(() => ({ doc: boot.doc }), { nudgeStep: view.gridStep, shortcuts: step === 2 });
  const toneFor = useBuilderTones(floorPlan.published?.doc ?? null);

  const hasDraft = useRef(boot.hadDraft);
  const published = useRef(false);
  const save = useCallback((): WriteOutcome => {
    if (published.current || !(hasDraft.current || editor.state.revision > 0)) return "saved";
    hasDraft.current = true;
    return floorPlan.saveDraft(editor.doc, { method: "quick", step, fromPublished: boot.fromPublished });
  }, [editor.doc, editor.state.revision, floorPlan, step, boot.fromPublished]);
  const autosave = useAutosave(editor.state.revision + stepRevision, save);

  useEffect(() => {
    if (saveState !== "saved") return;
    const id = window.setTimeout(() => setSaveState("idle"), 2200);
    return () => window.clearTimeout(id);
  }, [saveState]);

  const lastOutcome = useRef<WriteOutcome | null>(null);
  useEffect(() => {
    if (!autosave.outcome || autosave.outcome === lastOutcome.current) return;
    lastOutcome.current = autosave.outcome;
    if (autosave.outcome === "memoryOnly") notify(t("floorPlan.storage.memoryOnly"), "error");
    if (autosave.outcome === "savedWithoutBackground") notify(t("floorPlan.storage.withoutBackground"), "info");
  }, [autosave.outcome, notify, t]);

  function goTo(next: QuickStep) {
    setStep(next);
    setFurthest((current) => (next > current ? next : current));
    setStepRevision((r) => r + 1);
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function saveNow() {
    hasDraft.current = true;
    autosave.flush();
    setSaveState("saved");
    notify(t("floorPlan.actions.draftSaved"));
  }

  async function confirmPublish() {
    published.current = true;
    const doc = editor.doc;
    const outcome = await floorPlan.publish(doc);
    setConfirmOpen(false);
    setSuccessDoc(doc);
    if (outcome === "memoryOnly") notify(t("floorPlan.storage.memoryOnly"), "error");
  }

  function openFullBuilder() {
    hasDraft.current = true;
    floorPlan.saveDraft(editor.doc, { method: "scratch", fromPublished: boot.fromPublished });
    published.current = true; // this page must not write over the hand-off
    navigate(SCRATCH_PATH);
  }

  return (
    <PageShell>
      <EditLockNotice lock={lock} onTookOver={() => notify(at("lock.tookOver"))} />
      <div ref={topRef} className="scroll-mt-4">
        <PageHeader
          title={t("floorPlan.quick.title")}
          badge={<StepBadge step={step} />}
          subtitle={t("floorPlan.quick.subtitle")}
          aside={<StepProgress current={step} furthest={furthest} onJump={goTo} />}
        />
      </div>

      <div className="mt-7">
        {step === 1 && (
          <AddTablesStep
            doc={editor.doc}
            onCancel={() => (furthest >= 2 ? goTo(2) : navigate(FLOOR_PLAN_BUILDER_PATH))}
            onCreate={(options) => {
              const result = addQuickTables(editor.doc, options);
              editor.commit(result.doc, result.addedIds);
              goTo(2);
              notify(t(options.count === 1 ? "floorPlan.quick.createdOne" : "floorPlan.quick.created").replace("{n}", String(options.count)));
            }}
          />
        )}

        {step === 2 && (
          <ArrangeStep
            editor={editor}
            view={view}
            onViewChange={setView}
            toneFor={toneFor}
            onAddMore={() => goTo(1)}
            onPreview={() => goTo(3)}
            onPublish={() => setConfirmOpen(true)}
            onSaveDraft={saveNow}
            saveState={saveState}
            lastEditedAt={autosave.savedAt ?? floorPlan.draft?.savedAt ?? null}
            author={floorPlan.draft?.savedBy || floorPlan.author}
            onOpenFullBuilder={openFullBuilder}
          />
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <PlanReview
              doc={editor.doc}
              onRename={(name) => editor.commit({ ...editor.doc, name })}
              onShowItems={(ids) => {
                editor.select(ids);
                goTo(2);
              }}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2.4fr_5fr_7.6fr]">
              <button
                type="button"
                onClick={() => goTo(2)}
                className="flex h-14 items-center justify-center gap-2 rounded-[12px] border border-[var(--octo-border-input)] text-[16px] font-semibold text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
              >
                <ArrowLeft size={18} className="rtl:rotate-180" />
                {t("floorPlan.common.back")}
              </button>
              <button
                type="button"
                onClick={saveNow}
                className="h-14 rounded-[12px] bg-[var(--octo-seg-bg)] text-[17px] font-semibold text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-track)]"
              >
                {saveState === "saved" ? t("floorPlan.actions.saved") : t("floorPlan.actions.saveDraft")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex h-14 items-center justify-center gap-2.5 rounded-[12px] bg-[#0D6EFD] text-[17px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Rocket size={19} />
                {t("floorPlan.actions.publish")}
              </button>
            </div>
          </div>
        )}
      </div>

      <PublishConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmPublish}
        doc={editor.doc}
        replacingName={floorPlan.published?.doc.name ?? null}
      />
      {successDoc && (
        <PublishSuccessModal
          open
          doc={successDoc}
          onViewLive={() => navigate(LIVE_FLOOR_PLAN_PATH)}
          onBackToBuilder={() => navigate(FLOOR_PLAN_BUILDER_PATH)}
        />
      )}
      <ToastBanner toast={toast} />
    </PageShell>
  );
}
