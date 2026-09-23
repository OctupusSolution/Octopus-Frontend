// The builder's hold on the plan (BACKEND_GAPS 3.9). While a builder is open
// it takes the plan's edit lock and renews it on a heartbeat; leaving gives it
// back. When someone else holds it the merchant is told before editing, and
// can go back, look without editing, or take it over (a forced release, then
// a fresh take — the server audits the takeover). The server only enforces
// the lock against *other* people's writes, so a merchant who looks anyway
// sees the clash as a sync error, not silently lost work.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, LockOpen, UserRoundX } from "lucide-react";
import { ApiError, acquireFloorPlanEditLock, getFloorPlan, releaseFloorPlanEditLock } from "@octopus/api-client";
import { floorPlanIdOf } from "@/entities/floor-plan";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAdminText } from "../../_shared/admin-text";
import { errorText } from "../../_shared/api-error";
import { ConfirmModal } from "../../_shared/confirm-modal";
import { formatDateTime } from "../../_shared/format";
import { FLOOR_PLAN_BUILDER_PATH } from "../../_shared/paths";

const HEARTBEAT_MS = 45_000;

export type EditLockStatus =
  | { kind: "pending" }
  | { kind: "mine"; expiresAt: string | null }
  | { kind: "heldByOther"; expiresAt: string | null; lost: boolean };

const heldByOther = (err: unknown) => err instanceof ApiError && err.status === 409 && err.problem?.errorCode === "floor-plan.lock.held-by-other";

export function useEditLock() {
  const { activeBusinessId } = useAuth();
  const [status, setStatus] = useState<EditLockStatus>({ kind: "pending" });
  const [error, setError] = useState<string | null>(null);
  const planRef = useRef<string | null>(null);
  const mine = useRef(false);
  const t = useAdminText();

  const take = useCallback(async () => {
    if (!activeBusinessId) return;
    // No plan until the first save creates one; the next beat tries again.
    const planId = planRef.current ?? (planRef.current = await floorPlanIdOf(activeBusinessId));
    if (!planId) return;
    try {
      const lock = await acquireFloorPlanEditLock(activeBusinessId, planId);
      mine.current = true;
      setStatus({ kind: "mine", expiresAt: lock.expiresAtUtc });
    } catch (err) {
      if (!heldByOther(err)) return; // archived, offline…: nothing to show about the lock
      const wasMine = mine.current;
      mine.current = false;
      const plan = await getFloorPlan(activeBusinessId, planId).catch(() => null);
      setStatus({ kind: "heldByOther", expiresAt: plan?.editLock.expiresAtUtc ?? null, lost: wasMine });
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void take();
    const id = window.setInterval(() => void take(), HEARTBEAT_MS);
    return () => {
      window.clearInterval(id);
      const planId = planRef.current;
      if (activeBusinessId && planId && mine.current) {
        mine.current = false;
        void releaseFloorPlanEditLock(activeBusinessId, planId).catch(() => undefined);
      }
    };
  }, [take, activeBusinessId]);

  const takeOver = useCallback(async () => {
    const planId = planRef.current;
    if (!activeBusinessId || !planId) return;
    setError(null);
    try {
      await releaseFloorPlanEditLock(activeBusinessId, planId, true).catch((err) => {
        // Already free by the time we asked: nothing to force.
        if (!(err instanceof ApiError && err.problem?.errorCode === "floor-plan.lock.not-held")) throw err;
      });
      await take();
    } catch (err) {
      setError(errorText(err, t));
    }
  }, [activeBusinessId, take, t]);

  return { status, error, takeOver };
}

export function EditLockNotice({ lock, onTookOver }: { lock: ReturnType<typeof useEditLock>; onTookOver?: () => void }) {
  const at = useAdminText();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const { status } = lock;

  useEffect(() => {
    if (status.kind !== "heldByOther") setDismissed(false);
  }, [status.kind]);

  if (status.kind !== "heldByOther") return null;

  const when = status.expiresAt ? formatDateTime(Date.parse(status.expiresAt), locale) : "—";
  const takeOver = async () => {
    setBusy(true);
    await lock.takeOver();
    setBusy(false);
    onTookOver?.();
  };

  return (
    <>
      <div role="status" className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[10px] bg-[#F59E0B]/12 px-4 py-2.5 text-[13px] text-[#B45309]">
        <span className="flex items-center gap-2">
          {status.lost ? <UserRoundX size={16} /> : <Lock size={16} />}
          {status.lost ? at("lock.lost") : at("lock.heldAnon")} · {at("lock.heldBody", { when })}
        </span>
        <button type="button" disabled={busy} onClick={() => void takeOver()} className="flex shrink-0 items-center gap-1.5 font-semibold underline disabled:opacity-50">
          <LockOpen size={14} />
          {at("lock.takeOver")}
        </button>
        {lock.error && <span className="w-full text-[12px] text-error">{lock.error}</span>}
      </div>
      <ConfirmModal
        open={!dismissed && !status.lost}
        onClose={() => setDismissed(true)}
        tone="warning"
        icon={<Lock size={20} />}
        title={at("lock.heldAnon")}
        body={at("lock.heldBody", { when })}
        actions={[
          { label: at("lock.back"), variant: "secondary", onClick: () => navigate(FLOOR_PLAN_BUILDER_PATH) },
          { label: at("lock.viewAnyway"), variant: "secondary", onClick: () => setDismissed(true) },
          {
            label: at("lock.takeOver"),
            icon: <LockOpen size={15} />,
            onClick: () => {
              setDismissed(true);
              void takeOver();
            },
          },
        ]}
      />
    </>
  );
}
