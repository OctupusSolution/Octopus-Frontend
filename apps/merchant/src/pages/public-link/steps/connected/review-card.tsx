// The publishing review (GET /draft/review): the same inspector publish runs.
// Blocking findings stop a publish; warnings and suggestions never do.
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, RefreshCw, XCircle } from "lucide-react";
import type { ReviewFindingResponse } from "@octopus/api-client";
import type { PublicLinkSync } from "@/entities/site-draft";
import { findingText, usePlText } from "../../_shared/texts";
import { CARD, CARD_TITLE, SMALL_BUTTON, useBusy } from "./common";

const SHOWN = 6;

function Group({ title, tone, findings }: { title: string; tone: "error" | "warning" | "info"; findings: ReviewFindingResponse[] }) {
  const tx = usePlText();
  if (findings.length === 0) return null;
  const Icon = tone === "error" ? XCircle : tone === "warning" ? AlertTriangle : Info;
  const color = tone === "error" ? "text-[#DC2626]" : tone === "warning" ? "text-[#B45309]" : "text-[#0D6EFD]";
  // One line per code: the same finding on many pages reads as one item with a count.
  const byCode = new Map<string, number>();
  for (const f of findings) byCode.set(f.code, (byCode.get(f.code) ?? 0) + 1);
  const rows = Array.from(byCode.entries());
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`text-[10.5px] font-semibold uppercase tracking-[0.06em] ${color}`}>{title}</span>
      {rows.slice(0, SHOWN).map(([code, count]) => (
        <span key={code} className="flex items-start gap-2 text-[12px] text-[var(--octo-text-primary)]">
          <Icon size={14} className={`mt-0.5 shrink-0 ${color}`} />
          <span>
            {findingText(tx, code)}
            {count > 1 && <span className="ms-1 text-[11px] text-[var(--octo-text-muted)]">×{count}</span>}
          </span>
        </span>
      ))}
      {rows.length > SHOWN && <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.review.more", { n: rows.length - SHOWN })}</span>}
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
    <div className={CARD}>
      <div className="flex items-center justify-between gap-2">
        <p className={CARD_TITLE}>{tx("pl.review.title")}</p>
        <button type="button" className={SMALL_BUTTON} disabled={busy !== null} onClick={() => void act("load", () => sync.refreshReview())}>
          <RefreshCw size={12} className={busy ? "animate-spin" : undefined} />
          {tx("pl.review.refresh")}
        </button>
      </div>
      {review && review.totals.blocking === 0 && (
        <span className="flex items-center gap-2 text-[12px] font-medium text-[#16a34a]">
          <CheckCircle2 size={15} />
          {tx("pl.review.ok")}
        </span>
      )}
      <Group title={tx("pl.review.blocking")} tone="error" findings={blocking} />
      <Group title={tx("pl.review.warnings")} tone="warning" findings={warnings} />
      <Group title={tx("pl.review.recommendations")} tone="info" findings={recs} />
    </div>
  );
}
