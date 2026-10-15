// One code lineage's timeline. The server sends it oldest first; it is drawn
// newest first. A history with missing entries offers the server's rebuild.
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  listPlaceCodeActivity,
  rebuildPlaceCodeHistory,
  type PlaceCodeActivityKind,
  type PlaceCodeActivityResponse,
} from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { BORDER_200, TEXT_PRIMARY, TEXT_SECONDARY } from "../../_shared/theme";
import { formatDate } from "./parts";
import type { PlaceCodesState } from "./use-place-codes";

const DOT: Record<PlaceCodeActivityKind, string> = {
  Generated: "bg-[#009a39]",
  Enabled: "bg-[#009a39]",
  Disabled: "bg-[#d30202]",
  Relinked: "bg-[#0d6efd]",
  Revoked: "bg-[#0f172a] [[data-theme=dark]_&]:bg-[#e2e8f0]",
  Printed: "bg-[#c27c00]",
  Exported: "bg-[#c27c00]",
};

export function ActivityList({ pc, codeId, revision }: { pc: PlaceCodesState; codeId: string; revision?: number | null }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<PlaceCodeActivityResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    setFailed(false);
    listPlaceCodeActivity(pc.businessId, codeId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [pc.businessId, codeId]);

  // Reloads when the code moves on (an action in the modal bumps its revision).
  useEffect(load, [load, revision]);

  async function rebuild() {
    setRebuilding(true);
    try {
      await pc.run((b) => rebuildPlaceCodeHistory(b, codeId));
      load();
    } catch {
      // run() toasted.
    } finally {
      setRebuilding(false);
    }
  }

  if (failed) {
    return (
      <p className={clsx("text-[14px]", TEXT_SECONDARY)}>
        {t("floorPlan.qr.error.generic")}{" "}
        <button type="button" className="font-semibold underline" onClick={load}>
          {t("floorPlan.qr.retry")}
        </button>
      </p>
    );
  }
  if (!data) return <div className="h-24 animate-pulse rounded-[12px] bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-border-card)]" />;

  const entries = [...data.entries].reverse();
  const missing = Math.max(0, data.history.expected - data.history.recorded);
  return (
    <div className="flex flex-col gap-3">
      {!data.history.complete && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-[#fef1db] px-3 py-2 text-[13px] text-[#ae6919] [[data-theme=dark]_&]:bg-[var(--octo-tone-warning-bg)]">
          <span>{t("floorPlan.qr.activity.missing").replace("{n}", String(missing))}</span>
          <button type="button" disabled={rebuilding} onClick={() => void rebuild()} className="shrink-0 font-semibold underline disabled:opacity-50">
            {t("floorPlan.qr.activity.rebuild")}
          </button>
        </div>
      )}
      {entries.length === 0 ? (
        <p className={clsx("text-[14px]", TEXT_SECONDARY)}>{t("floorPlan.qr.activity.empty")}</p>
      ) : (
        <ol className={clsx("flex flex-col rounded-[8px] border px-3", BORDER_200)}>
          {entries.map((e, i) => (
            <li key={`${e.generation}-${e.revision ?? "x"}-${e.kind}-${i}`} className={clsx("flex items-start gap-3 border-b py-2 last:border-b-0", BORDER_200)}>
              <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[e.kind])} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={clsx("text-[14px] font-medium leading-[1.3]", TEXT_PRIMARY)} dir="auto">
                  {t(`floorPlan.qr.activity.kind.${e.kind}`).replace("{number}", e.placeNumber ?? "—")}
                  {e.reconstructed && <span className={clsx("ms-2 text-[11px] font-normal", TEXT_SECONDARY)}>{t("floorPlan.qr.activity.reconstructed")}</span>}
                </span>
                <span className={clsx("text-[12px] leading-[1.3]", TEXT_SECONDARY)} dir="auto">
                  {formatDate(Date.parse(e.occurredAtUtc), locale, true)}
                  {e.actor ? ` · ${e.actor}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
