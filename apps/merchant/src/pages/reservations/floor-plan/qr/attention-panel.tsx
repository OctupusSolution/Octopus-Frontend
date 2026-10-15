// Codes whose table left the published floor. Each one is moved to a table
// (the server's suggested one, or a picked one) or revoked.
import { useRef, useState } from "react";
import clsx from "clsx";
import { relinkPlaceCode, revokePlaceCode, type PlaceCodeAttention } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { ConfirmDialog } from "./confirm-dialog";
import type { Notify, PlaceCodesState } from "./use-place-codes";

const SMALL_BTN = "inline-flex h-8 items-center rounded-[8px] px-3 text-[13px] font-semibold disabled:opacity-50";

export function AttentionPanel({
  pc,
  notify,
  onRelink,
}: {
  pc: PlaceCodesState;
  notify: Notify;
  onRelink: (codeId: string) => void;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<PlaceCodeAttention | null>(null);
  // Operation ids per code and action, reused if that action is retried.
  const ops = useRef(new Map<string, string>());
  const opFor = (key: string) => {
    let id = ops.current.get(key);
    if (!id) {
      id = crypto.randomUUID();
      ops.current.set(key, id);
    }
    return id;
  };

  if (pc.attention.length === 0) return null;

  async function moveToCandidate(a: PlaceCodeAttention) {
    if (!a.candidate || pending) return;
    const key = `relink:${a.codeId}:${a.candidate.resourceId}`;
    setPending(a.codeId);
    try {
      await pc.run((b) => relinkPlaceCode(b, a.codeId, opFor(key), a.candidate!.resourceId, a.revision));
      ops.current.delete(key);
      notify(t("floorPlan.qr.relink.done").replace("{number}", a.candidate.number));
    } catch {
      // run() toasted.
    } finally {
      setPending(null);
    }
  }

  async function revoke(a: PlaceCodeAttention) {
    const key = `revoke:${a.codeId}`;
    setPending(a.codeId);
    try {
      await pc.run((b) => revokePlaceCode(b, a.codeId, opFor(key), a.revision));
      ops.current.delete(key);
      setRevoking(null);
      notify(t("floorPlan.qr.attention.revoked"), "info");
    } catch {
      // run() toasted.
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[12px] border border-[#f5d9a8] bg-[#fef8ec] p-4 [[data-theme=dark]_&]:border-[var(--octo-border-card)] [[data-theme=dark]_&]:bg-[var(--octo-tone-warning-bg)]">
      <header className="flex flex-col gap-1">
        <h2 className="text-[16px] font-semibold leading-[1.3] text-[#ae6919]">
          {t("floorPlan.qr.attention.title").replace("{n}", String(pc.attention.length))}
        </h2>
        <p className="text-[13px] leading-[1.4] text-[#7c4a0c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]">{t("floorPlan.qr.attention.body")}</p>
      </header>
      <ul className="flex flex-col gap-2">
        {pc.attention.map((a) => (
          <li
            key={a.codeId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-white px-3 py-2 [[data-theme=dark]_&]:bg-[var(--octo-card)]"
          >
            <span className="text-[14px] font-medium text-[#0f172a] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]" dir="auto">
              {t("floorPlan.qr.attention.wasTable").replace("{number}", a.lastKnownNumber ?? "—")}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {a.candidate && (
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void moveToCandidate(a)}
                  className={clsx(SMALL_BTN, "bg-[#0d6efd] text-white hover:bg-[#0b5ed7]")}
                >
                  {t("floorPlan.qr.attention.moveTo").replace("{number}", a.candidate.number)}
                </button>
              )}
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => onRelink(a.codeId)}
                className={clsx(SMALL_BTN, "border border-[#0d6efd] text-[#0d6efd] hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[var(--octo-selected)]")}
              >
                {t("floorPlan.qr.attention.chooseTable")}
              </button>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => setRevoking(a)}
                className={clsx(SMALL_BTN, "text-[#d30202] hover:bg-[#fef0f0] [[data-theme=dark]_&]:text-[#f87171]")}
              >
                {t("floorPlan.qr.revoke")}
              </button>
            </span>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={revoking !== null}
        title={t("floorPlan.qr.confirm.revoke.title")}
        body={t("floorPlan.qr.confirm.revoke.body")}
        confirmLabel={t("floorPlan.qr.revoke")}
        cancelLabel={t("floorPlan.common.cancel")}
        tone="danger"
        pending={pending !== null}
        onConfirm={() => revoking && void revoke(revoking)}
        onCancel={() => setRevoking(null)}
      />
    </section>
  );
}
