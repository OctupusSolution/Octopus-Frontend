// The Review step's three severity buckets, straight from validate().
//
// A bucket with nothing in it is not drawn. The frame shows counts because the
// merchant is deciding how much work is left, and an empty "Errors (0)" panel
// would make a clean menu look like it had a problem.
import { useState } from "react";
import clsx from "clsx";
import type { Finding, ValidationResult } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { MenuIcon } from "../../_shared/menu-icon";
import { LINE, TEXT, TEXT_GRAY } from "../../_shared/theme";

type Tone = "danger" | "warning" | "info";

/** Border, header fill and the solid of the icon and the count badge. */
const TONE: Record<Tone, { border: string; fill: string; solid: string; badge: string }> = {
  danger: {
    border: "border-[#d30202]",
    fill: "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[#d30202]/15",
    solid: "text-[#d30202]",
    badge: "bg-[#d30202]",
  },
  warning: {
    border: "border-[#f59e0b]",
    fill: "bg-[#fff2db] [[data-theme=dark]_&]:bg-[#f59e0b]/15",
    solid: "text-[#f59e0b]",
    badge: "bg-[#f59e0b]",
  },
  info: {
    border: "border-[#0D6EFD]",
    fill: "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/15",
    solid: "text-[#0D6EFD]",
    badge: "bg-[#0D6EFD]",
  },
};

function Bucket({
  findings,
  titleKey,
  hintKey,
  tone,
  icon,
  iconSize = 24,
}: {
  findings: Finding[];
  titleKey: string;
  hintKey?: string;
  tone: Tone;
  icon: string;
  /** The exported glyph's own size inside the frame's 24px box. */
  iconSize?: number;
}) {
  const { t } = useI18n();
  if (findings.length === 0) return null;

  const total = findings.reduce((n, f) => n + f.count, 0);
  const look = TONE[tone];

  return (
    <section className={clsx("flex flex-col gap-3 overflow-hidden rounded-[12px] border pb-2", look.border)}>
      <div className={clsx("flex items-center gap-1 p-2", look.fill)}>
        <span className={clsx("grid size-6 shrink-0 place-items-center", look.solid)}>
          <MenuIcon name={icon} size={iconSize} />
        </span>
        <p className={clsx("min-w-0 flex-1 text-[12px] font-bold leading-3", TEXT)}>
          {t(titleKey)}
          {hintKey && <span className="font-normal"> ({t(hintKey)})</span>}
        </p>
        <span className={clsx("grid h-6 min-w-6 shrink-0 place-items-center rounded-[12px] px-1 text-[12px] font-bold leading-3 text-white", look.badge)}>
          {total}
        </span>
      </div>

      <ul className="flex flex-col gap-3 px-2">
        {findings.map((finding) => (
          <li key={finding.id} className="flex min-h-[14px] items-center justify-between gap-3">
            <span className={clsx("text-[12px] font-medium leading-3", TEXT_GRAY)}>{t(`menuReview.find.${finding.id}`)}</span>
            <span className={clsx("shrink-0 text-end text-[14px] font-semibold leading-[14px]", TEXT)}>{finding.count}</span>
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
    <section className={clsx("flex min-w-0 flex-col gap-4 overflow-hidden rounded-[24px] border p-3", LINE)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={clsx("text-[14px] font-bold leading-[14px]", TEXT)}>{t("menuReview.summaryTitle")}</h2>
        <button
          type="button"
          onClick={refresh}
          aria-label={t("menuReview.refresh")}
          title={t("menuReview.refresh")}
          className={clsx("grid size-6 shrink-0 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT)}
        >
          <MenuIcon name="menu-refresh.svg" size={19.5} className={clsx(spinning && "animate-spin")} />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Success only when nothing blocks publishing — a green "almost
            ready" above a red error list contradicted itself. */}
        <div
          className={clsx(
            "flex items-start gap-1 rounded-[12px] p-2",
            blocked ? "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[#d30202]/15" : "bg-[#dcffef] [[data-theme=dark]_&]:bg-[#009a39]/15"
          )}
        >
          <MenuIcon
            name={blocked ? "menu-close-circle.svg" : "menu-check-done-circle.svg"}
            size={24}
            className={blocked ? "text-[#d30202]" : "text-[#009a39]"}
          />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-[12px]">
            <p className={clsx("font-bold leading-3", TEXT, clean && "py-[6px]")}>{t(blocked ? "menuReview.notReadyTitle" : "menuReview.allGoodTitle")}</p>
            {!clean && <p className={clsx("font-medium leading-[1.4]", TEXT_GRAY)}>{t(blocked ? "menuReview.notReadyBody" : "menuReview.allGoodBody")}</p>}
          </div>
        </div>

        {!clean && (
          <div className="flex flex-col gap-3">
            <Bucket findings={result.errors} titleKey="menuReview.errors" hintKey="menuReview.errorsHint" tone="danger" icon="menu-close-circle.svg" />
            <Bucket
              findings={result.warnings}
              titleKey="menuReview.warnings"
              hintKey="menuReview.warningsHint"
              tone="warning"
              icon="menu-error-circle-solid.svg"
            />
            <Bucket findings={result.recommendations} titleKey="menuReview.recommendations" tone="info" icon="menu-recommend.svg" iconSize={21.5} />
          </div>
        )}
      </div>
    </section>
  );
}
