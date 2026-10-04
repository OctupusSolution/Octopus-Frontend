// Where a merchant chooses how to build their floor plan. The first visit gets
// the welcome illustration; once a draft or a published plan exists the hub
// leads with that instead, and starting over never silently throws a draft
// away.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePen, History, LayoutTemplate, Settings2, SquareDashedBottom } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";
import { BORDER_300, TEXT_PRIMARY, TEXT_SECONDARY } from "../../_shared/theme";
import { useAdminText } from "./admin-text";
import { ConfirmModal } from "./confirm-modal";
import { DraftBanner } from "./draft-banner";
import { MethodCards, type BuildMethod } from "./method-cards";
import { PageHeader, PageShell } from "./page-header";
import { QUICK_BOX_PATH, SCRATCH_PATH, scratchPath, type ScratchSource } from "./paths";
import { PlanSummaryCard } from "./plan-summary-card";
import { PlansPanel } from "./plans-panel";
import { FloorPlanSettingsModal } from "./settings-modal";
import { ToastBanner, useToast } from "./toast";
import { WatchTutorialButton } from "./tutorial";
import { useFloorPlan } from "./use-floor-plan";
import { FloorPlanVersionsModal } from "./versions-modal";

type Pending =
  | { kind: "replaceDraft"; method: Exclude<BuildMethod, "ai">; source?: ScratchSource }
  | { kind: "chooseSource" }
  | { kind: "discard" };

const TOOL_BUTTON =
  "flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-[14px] font-medium leading-[14px] transition-colors hover:bg-[var(--octo-hover)]";

export function FloorPlanHub() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const at = useAdminText();
  const { draft, published, discardDraft, listVersions, restoreVersion, getVersion, rollbackVersion, activePlanId, switchPlan, reload } = useFloorPlan();
  const [pending, setPending] = useState<Pending | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast, notify } = useToast();

  function openEditor(method: Exclude<BuildMethod, "ai">, source?: ScratchSource) {
    navigate(method === "quick" ? QUICK_BOX_PATH : scratchPath(source ?? "blank"));
  }

  function start(method: BuildMethod) {
    if (method === "ai") return;
    if (draft) {
      setPending({ kind: "replaceDraft", method });
      return;
    }
    if (method === "scratch" && published) {
      setPending({ kind: "chooseSource" });
      return;
    }
    openEditor(method);
  }

  function continueDraft() {
    if (!draft) return;
    navigate(draft.method === "quick" ? QUICK_BOX_PATH : SCRATCH_PATH);
  }

  function editLive() {
    if (draft) {
      setPending({ kind: "replaceDraft", method: "scratch", source: "live" });
      return;
    }
    openEditor("scratch", "live");
  }

  const hasPlan = Boolean(draft || published);

  return (
    <PageShell>
      <PageHeader title={t("floorPlan.hub.title")} subtitle={t("floorPlan.hub.subtitle")} aside={<WatchTutorialButton />} />

      {hasPlan ? (
        <div className="mt-8 flex flex-col gap-8">
          {draft && <DraftBanner draft={draft} onContinue={continueDraft} onDiscard={() => setPending({ kind: "discard" })} />}
          <PlanSummaryCard
            published={published}
            draft={draft}
            action={
              published ? (
                <button
                  type="button"
                  onClick={editLive}
                  className="h-10 w-full whitespace-nowrap rounded-lg bg-[#0d6efd] px-3 py-2 text-[16px] font-bold leading-[16px] text-white transition-opacity hover:opacity-90 lg:w-[260px]"
                >
                  {t("floorPlan.live.edit")}
                </button>
              ) : undefined
            }
          />
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h2 className={clsx("text-[20px] font-bold leading-[20px]", TEXT_PRIMARY)}>{t("floorPlan.hub.getStartedTitle")}</h2>
              <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SECONDARY)}>{t("floorPlan.hub.getStartedSubtitle")}</p>
            </div>
            <MethodCards onStart={start} />
          </div>
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center gap-10">
          <div className="flex w-full flex-col items-center gap-6 text-center">
            <img src={FLOOR_PLAN_ASSETS.welcome} alt="" className="h-[125px] w-[255px] max-w-full object-contain" />
            <div className="flex w-full flex-col gap-3">
              <h2 className={clsx("text-[24px] font-semibold leading-[24px]", TEXT_PRIMARY)}>{t("floorPlan.hub.welcomeTitle")}</h2>
              <p className={clsx("text-[16px] font-medium leading-[16px]", TEXT_SECONDARY)}>{t("floorPlan.hub.welcomeSubtitle")}</p>
            </div>
          </div>
          <MethodCards className="w-full" onStart={start} />
        </div>
      )}

      {/* Below the frame's content: plan tools the frames don't draw. */}
      <div className="mt-10 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setSettingsOpen(true)} className={clsx(TOOL_BUTTON, BORDER_300, TEXT_PRIMARY)}>
          <Settings2 size={16} />
          {at("settings.open")}
        </button>
        {published && (
          <button type="button" onClick={() => setVersionsOpen(true)} className={clsx(TOOL_BUTTON, BORDER_300, TEXT_PRIMARY)}>
            <History size={16} />
            {t("floorPlan.versions.open")}
          </button>
        )}
      </div>

      <PlansPanel
        className="mt-4"
        activePlanId={activePlanId}
        onSwitch={switchPlan}
        onActiveChanged={(removed) => (removed ? switchPlan(null) : reload())}
        notify={notify}
      />

      <ConfirmModal
        open={pending?.kind === "replaceDraft"}
        onClose={() => setPending(null)}
        tone="warning"
        icon={<FilePen size={20} />}
        title={t("floorPlan.hub.replaceDraft.title")}
        body={t("floorPlan.hub.replaceDraft.body")}
        actions={[
          {
            label: t("floorPlan.hub.replaceDraft.discard"),
            variant: "secondary",
            onClick: () => {
              if (pending?.kind !== "replaceDraft") return;
              discardDraft();
              const { method, source } = pending;
              setPending(null);
              if (method === "scratch" && !source && published) {
                setPending({ kind: "chooseSource" });
                return;
              }
              openEditor(method, source);
            },
          },
          {
            label: t("floorPlan.draft.continue"),
            onClick: () => {
              setPending(null);
              continueDraft();
            },
          },
        ]}
      />

      <ConfirmModal
        open={pending?.kind === "chooseSource"}
        onClose={() => setPending(null)}
        icon={<LayoutTemplate size={20} />}
        title={t("floorPlan.hub.chooseSource.title")}
        body={t("floorPlan.hub.chooseSource.body")}
        actions={[
          {
            label: t("floorPlan.hub.chooseSource.blank"),
            variant: "secondary",
            icon: <SquareDashedBottom size={15} />,
            onClick: () => {
              setPending(null);
              openEditor("scratch", "blank");
            },
          },
          {
            label: t("floorPlan.hub.chooseSource.live"),
            icon: <LayoutTemplate size={15} />,
            onClick: () => {
              setPending(null);
              openEditor("scratch", "live");
            },
          },
        ]}
      />

      <ConfirmModal
        open={pending?.kind === "discard"}
        onClose={() => setPending(null)}
        tone="danger"
        icon={<FilePen size={20} />}
        title={t("floorPlan.draft.discardTitle")}
        body={published ? t("floorPlan.draft.discardBodyLive") : t("floorPlan.draft.discardBody")}
        actions={[
          { label: t("floorPlan.common.cancel"), variant: "secondary", onClick: () => setPending(null) },
          {
            label: t("floorPlan.draft.discard"),
            variant: "danger",
            onClick: () => {
              discardDraft();
              setPending(null);
            },
          },
        ]}
      />

      <FloorPlanVersionsModal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        listVersions={listVersions}
        onRestore={restoreVersion}
        getVersion={getVersion}
        onRollback={rollbackVersion}
      />
      <FloorPlanSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={(message) => notify(message)} />
      <ToastBanner toast={toast} />
    </PageShell>
  );
}
