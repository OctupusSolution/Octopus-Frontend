// Where a merchant chooses how to build their floor plan. The first visit gets
// the welcome illustration; once a draft or a published plan exists the hub
// leads with that instead, and starting over never silently throws a draft
// away.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePen, History, LayoutTemplate, Pencil, Settings2, SquareDashedBottom } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";
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
      <PageHeader
        title={t("floorPlan.hub.title")}
        subtitle={t("floorPlan.hub.subtitle")}
        aside={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={at("settings.open")}
              title={at("settings.open")}
              className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3.5 text-[14px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <Settings2 size={16} />
              <span className="hidden sm:inline">{at("settings.open")}</span>
            </button>
            <WatchTutorialButton />
          </div>
        }
      />

      {draft && <DraftBanner className="mt-6" draft={draft} onContinue={continueDraft} onDiscard={() => setPending({ kind: "discard" })} />}

      {hasPlan ? (
        <>
          <PlanSummaryCard
            className="mt-6"
            published={published}
            draft={draft}
            action={
              published ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setVersionsOpen(true)}
                    className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-4 text-[14px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
                  >
                    <History size={16} />
                    {t("floorPlan.versions.open")}
                  </button>
                  <button
                    type="button"
                    onClick={editLive}
                    className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#0D6EFD] px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <Pencil size={16} />
                    {t("floorPlan.live.edit")}
                  </button>
                </div>
              ) : undefined
            }
          />
          <h2 className="mt-9 text-[21px] font-bold text-[var(--octo-text-primary)]">{t("floorPlan.hub.getStartedTitle")}</h2>
          <p className="mt-1 text-[14.5px] text-[var(--octo-text-secondary)]">{t("floorPlan.hub.getStartedSubtitle")}</p>
          <MethodCards className="mt-5" onStart={start} />
        </>
      ) : (
        <>
          <div className="mt-6 flex flex-col items-center text-center">
            <img src={FLOOR_PLAN_ASSETS.welcome} alt="" className="w-[360px] max-w-full" />
            <h2 className="mt-5 text-[24px] font-bold text-[var(--octo-text-primary)] sm:text-[28px]">{t("floorPlan.hub.welcomeTitle")}</h2>
            <p className="mt-2 text-[15px] text-[var(--octo-text-secondary)] sm:text-[17px]">{t("floorPlan.hub.welcomeSubtitle")}</p>
          </div>
          <MethodCards className="mt-10" onStart={start} />
        </>
      )}

      <PlansPanel
        className="mt-9"
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
