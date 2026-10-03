// The publishing review (GET /draft/review): the same inspector publish runs.
// Blocking findings stop a publish; warnings and suggestions never do.
//
// Drawn as one more of the Publish step's 12px panels (see publish-step.tsx).
import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { ReviewFindingResponse } from "@octopus/api-client";
import type { PublicLinkSync } from "@/entities/site-draft";
import { findingText, usePlText } from "../../_shared/texts";
import { PlButton, PlIcon, plPanel } from "../../ui/kit";
import { useBusy } from "./common";

const SHOWN = 6;

function Group({ title, tone, findings }: { title: string; tone: "error" | "warning" | "info"; findings: ReviewFindingResponse[] }) {
  const tx = usePlText();
  if (findings.length === 0) return null;
  const Icon = tone === "error" ? XCircle : tone === "warning" ? AlertTriangle : Info;
  const color = tone === "error" ? "text-[var(--pl-error)]" : tone === "warning" ? "text-[#B45309]" : "text-[var(--pl-primary)]";
  // One line per code: the same finding on many pages reads as one item with a count.
  const byCode = new Map<string, number>();
  for (const f of findings) byCode.set(f.code, (byCode.get(f.code) ?? 0) + 1);
  const rows = Array.from(byCode.entries());
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className={clsx("text-[12px] font-semibold leading-[12px]", color)}>{title}</span>
      {rows.slice(0, SHOWN).map(([code, count]) => (
        <span key={code} className="flex items-start gap-2 text-[14px] font-medium leading-[1.3] text-[var(--pl-text)]">
          <Icon size={16} className={clsx("mt-px shrink-0", color)} />
          <span>
            {findingText(tx, code)}
            {count > 1 && <span className="ms-1 text-[12px] text-[var(--pl-text-2)]">×{count}</span>}
          </span>
        </span>
      ))}
      {rows.length > SHOWN && <span className="text-[12px] font-medium leading-[1.3] text-[var(--pl-text-2)]">{tx("pl.review.more", { n: rows.length - SHOWN })}</span>}
    </div>
  );
}

export function ReviewCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { act, busy } = useBusy();
  const [loaded, setLoaded] = useState(false);
  const review = sync.server?.review ?? null;

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    void act("load", () => sync.refreshReview());
  }, [loaded, act, sync]);

  const findings = review?.findings ?? [];
  const blocking = findings.filter((f) => f.severity === "Error");
  const warnings = findings.filter((f) => f.severity === "Warning");
  const recs = findings.filter((f) => f.severity === "Recommendation");

  return (
    <div className={clsx(plPanel, "flex flex-col gap-4 px-3 py-4")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">{tx("pl.review.title")}</p>
        <PlButton size="xs" variant="outline" disabled={busy !== null} onClick={() => void act("load", () => sync.refreshReview())}>
          <PlIcon name="refresh" size={16} className={busy ? "animate-spin" : undefined} />
          {tx("pl.review.refresh")}
        </PlButton>
      </div>
      {review && review.totals.blocking === 0 && (
        <span className="flex items-center gap-2 text-[14px] font-medium leading-[14px] text-[var(--pl-success)]">
          <PlIcon name="publish-completed-solid" size={20} />
          {tx("pl.review.ok")}
        </span>
      )}
      {findings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Group title={tx("pl.review.blocking")} tone="error" findings={blocking} />
          <Group title={tx("pl.review.warnings")} tone="warning" findings={warnings} />
          <Group title={tx("pl.review.recommendations")} tone="info" findings={recs} />
        </div>
      )}
    </div>
  );
}
