// The Review step's three severity buckets, straight from validate().
//
// A bucket with nothing in it is not drawn. The frame shows counts because the
// merchant is deciding how much work is left, and an empty "Errors (0)" panel
// would make a clean menu look like it had a problem.
import { AlertTriangle, CheckCircle2, Lightbulb, XCircle } from "lucide-react";
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
  icon: typeof XCircle;
}) {
  const { t } = useI18n();
  if (findings.length === 0) return null;

  const total = findings.reduce((n, f) => n + f.count, 0);

  return (
    <section
      className="rounded-[10px] border p-3"
      style={{
        borderColor: `var(--octo-tone-${tone}-border, var(--octo-border-card))`,
        backgroundColor: `var(--octo-tone-${tone}-bg)`,
      }}
    >
      <p
        className="flex items-center justify-between gap-2 text-[14px] font-semibold"
        style={{ color: `var(--octo-tone-${tone}-text)` }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon size={17} aria-hidden />
          {t(titleKey)}
          {hintKey && <span className="font-normal">({t(hintKey)})</span>}
        </span>
        <span
          className="grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[12px] text-white"
          style={{ backgroundColor: `var(--octo-tone-${tone}-text)` }}
        >
          {total}
        </span>
      </p>

      <ul className="mt-2 space-y-1.5">
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

export function ValidationSummary({ result }: { result: ValidationResult }) {
  const { t } = useI18n();
  const clean =
    result.errors.length === 0 &&
    result.warnings.length === 0 &&
    result.recommendations.length === 0;

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuReview.summaryTitle")}
      </h2>

      <div className="mt-2.5 space-y-2.5">
        <div
          className="flex items-start gap-2.5 rounded-[10px] p-3"
          style={{ backgroundColor: "var(--octo-tone-success-bg)" }}
        >
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
            style={{ color: "var(--octo-tone-success-text)" }}
            aria-hidden
          />
          <span>
            <span
              className="block text-[14px] font-semibold"
              style={{ color: "var(--octo-tone-success-text)" }}
            >
              {t("menuReview.allGoodTitle")}
            </span>
            {!clean && (
              <span className="block text-[13px] text-[var(--octo-text-secondary)]">
                {t("menuReview.allGoodBody")}
              </span>
            )}
          </span>
        </div>

        <Bucket
          findings={result.errors}
          titleKey="menuReview.errors"
          hintKey="menuReview.errorsHint"
          tone="danger"
          icon={XCircle}
        />
        <Bucket
          findings={result.warnings}
          titleKey="menuReview.warnings"
          hintKey="menuReview.warningsHint"
          tone="warning"
          icon={AlertTriangle}
        />
        <Bucket
          findings={result.recommendations}
          titleKey="menuReview.recommendations"
          tone="info"
          icon={Lightbulb}
        />
      </div>
    </section>
  );
}
