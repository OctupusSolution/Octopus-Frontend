// The Review step's three severity buckets, straight from validate().
//
// A bucket with nothing in it is not drawn. The frame shows counts because the
// merchant is deciding how much work is left, and an empty "Errors (0)" panel
// would make a clean menu look like it had a problem.
import { useState } from "react";
import clsx from "clsx";
import { CircleAlert, CircleCheck, CircleX, MessageSquareText, RefreshCw } from "lucide-react";
import type { Finding, ValidationResult } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

type Tone = "danger" | "warning" | "info";

function Bucket({
  findings,
  titleKey,
  hintKey,
  tone,
  icon: Icon,
}: {
  findings: Finding[];
  titleKey: string;
  hintKey?: string;
  tone: Tone;
  icon: typeof CircleX;
}) {
  const { t } = useI18n();
  if (findings.length === 0) return null;

  const total = findings.reduce((n, f) => n + f.count, 0);

  return (
    <section
      className="overflow-hidden rounded-[10px] border"
      style={{ borderColor: `var(--octo-tone-${tone}-text)` }}
    >
      <p
        className="flex items-center justify-between gap-2 px-3 py-2.5 text-[14px] font-semibold text-[var(--octo-text-primary)]"
        style={{ backgroundColor: `var(--octo-tone-${tone}-bg)` }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon size={20} style={{ color: `var(--octo-tone-${tone}-text)` }} aria-hidden />
          {t(titleKey)}
          {hintKey && <span className="font-normal">({t(hintKey)})</span>}
        </span>
        <span
          className="grid h-6 min-w-[24px] place-items-center rounded-full px-1.5 text-[12px] text-white"
          style={{ backgroundColor: `var(--octo-tone-${tone}-text)` }}
        >
          {total}
        </span>
      </p>

      <ul className="space-y-2 px-3 py-3">
        {findings.map((finding) => (
          <li
            key={finding.id}
            className="flex items-center justify-between gap-3 text-[13.5px] text-[var(--octo-text-primary)]"
          >
            <span>{t(`menuReview.find.${finding.id}`)}</span>
            <span className="font-semibold">{finding.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ValidationSummary({ result, onRefresh }: { result: ValidationResult; onRefresh: () => void }) {
  const { t } = useI18n();
  const [spinning, setSpinning] = useState(false);
  const blocked = result.errors.length > 0;
  const clean = !blocked && result.warnings.length === 0 && result.recommendations.length === 0;

  function refresh() {
    onRefresh();
    // A re-run that returns the same answer instantly looks like a dead
    // button; a brief spin says it ran.
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 600);
  }

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("menuReview.summaryTitle")}</h2>
        <button
          type="button"
          onClick={refresh}
          aria-label={t("menuReview.refresh")}
          title={t("menuReview.refresh")}
          className="rounded-[8px] p-1.5 text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
        >
          <RefreshCw size={19} className={clsx(spinning && "animate-spin")} aria-hidden />
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {/* Success only when nothing blocks publishing — a green "almost
            ready" above a red error list contradicted itself. */}
        <div
          className="flex items-start gap-2.5 rounded-[10px] p-3"
          style={{ backgroundColor: `var(--octo-tone-${blocked ? "danger" : "success"}-bg)` }}
        >
          {blocked ? (
            <CircleX size={20} className="mt-0.5 shrink-0" style={{ color: "var(--octo-tone-danger-text)" }} aria-hidden />
          ) : (
            <CircleCheck size={20} className="mt-0.5 shrink-0" style={{ color: "var(--octo-tone-success-text)" }} aria-hidden />
          )}
          <span>
            <span className="block text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t(blocked ? "menuReview.notReadyTitle" : "menuReview.allGoodTitle")}
            </span>
            {!clean && (
              <span className="block text-[13px] text-[var(--octo-text-secondary)]">
                {t(blocked ? "menuReview.notReadyBody" : "menuReview.allGoodBody")}
              </span>
            )}
          </span>
        </div>

        <Bucket
          findings={result.errors}
          titleKey="menuReview.errors"
          hintKey="menuReview.errorsHint"
          tone="danger"
          icon={CircleX}
        />
        <Bucket
          findings={result.warnings}
          titleKey="menuReview.warnings"
          hintKey="menuReview.warningsHint"
          tone="warning"
          icon={CircleAlert}
        />
        <Bucket
          findings={result.recommendations}
          titleKey="menuReview.recommendations"
          tone="info"
          icon={MessageSquareText}
        />
      </div>
    </section>
  );
}
