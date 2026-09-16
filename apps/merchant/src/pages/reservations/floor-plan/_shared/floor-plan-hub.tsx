// Where a merchant chooses how to build their floor plan. The first visit gets
// the welcome illustration; once a draft or a published plan exists the hub
// leads with that instead, and starting over never silently throws a draft
// away.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePen, LayoutTemplate, Pencil, SquareDashedBottom } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";
import { ConfirmModal } from "./confirm-modal";
import { DraftBanner } from "./draft-banner";
import { MethodCards, type BuildMethod } from "./method-cards";
import { PageHeader, PageShell } from "./page-header";
import { QUICK_BOX_PATH, SCRATCH_PATH, scratchPath, type ScratchSource } from "./paths";
import { PlanSummaryCard } from "./plan-summary-card";
import { WatchTutorialButton } from "./tutorial";
import { useFloorPlan } from "./use-floor-plan";

type Pending =
  | { kind: "replaceDraft"; method: Exclude<BuildMethod, "ai">; source?: ScratchSource }
  | { kind: "chooseSource" }
  | { kind: "discard" };

export function FloorPlanHub() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { draft, published, discardDraft } = useFloorPlan();
  const [pending, setPending] = useState<Pending | null>(null);

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

      {draft && <DraftBanner className="mt-6" draft={draft} onContinue={continueDraft} onDiscard={() => setPending({ kind: "discard" })} />}

      {hasPlan ? (
        <>
          <PlanSummaryCard
            className="mt-6"
            published={published}
            draft={draft}
            action={
              published ? (
                <button
                  type="button"
                  onClick={editLive}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0D6EFD] px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Pencil size={16} />
                  {t("floorPlan.live.edit")}
                </button>
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
    </PageShell>
  );
}
