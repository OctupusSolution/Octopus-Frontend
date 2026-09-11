// The detected menu drawn back as the printed page it came from.
//
// This is the frames' central promise — "AI is preserving your design while
// making every item clickable" — so it is rendered from the detection, not
// shown as a static picture: every box on the paper is a real item, its border
// is its real confidence, and clicking it selects it for editing. When the
// merchant renames a dish in the editor, the paper updates with it.
//
// The parchment, leaves and crest are CSS and inline SVG because the uploaded
// file itself is not rendered (a PDF would need a renderer this app does not
// ship). What the paper shows is what the reader understood, which is the
// thing being reviewed.
import clsx from "clsx";
import {
  bandFor,
  splitBalanced,
  type DetectedSection,
  type DetectionResult,
} from "@/entities/menu/ai-import";
import { useI18n } from "@/app/providers/i18n-provider";
import { BAND_TONE } from "./ai-style";

function Leaves({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 140" className={clsx("pointer-events-none absolute", className)} aria-hidden>
      <g fill="#8a9a5b" opacity="0.55">
        <path d="M10 130 C30 90 60 60 110 40 C80 70 50 100 10 130Z" />
        <path d="M30 128 C35 100 40 70 70 20 C70 60 55 95 30 128Z" opacity="0.7" />
        <path d="M5 100 C30 90 60 95 100 110 C60 115 30 110 5 100Z" opacity="0.6" />
        <path d="M50 135 C70 115 95 100 118 95 C95 115 75 125 50 135Z" opacity="0.5" />
      </g>
    </svg>
  );
}

function Crest() {
  return (
    <svg viewBox="0 0 48 48" className="mx-auto h-9 w-9" aria-hidden>
      <g fill="none" stroke="#b07a3a" strokeWidth="2" strokeLinecap="round">
        <path d="M24 6 V42" />
        <path d="M24 8 C20 13 20 17 24 20 C28 17 28 13 24 8Z" fill="#b07a3a" />
        <path d="M14 18 C12 28 17 34 24 36 C31 34 36 28 34 18" />
        <path d="M8 20 C7 32 14 40 24 41 C34 40 41 32 40 20" />
      </g>
    </svg>
  );
}

export interface PaperMenuProps {
  result: DetectionResult;
  columns: 2 | 3;
  /** Which of `result.pages` to draw, 0-based. */
  page?: number;
  /** While processing: only these items get boxes; the rest are faint text. */
  revealed?: ReadonlySet<string>;
  revealedSections?: number;
  selectedId?: string | null;
  onSelect?: (itemId: string) => void;
  /** Upload screen: outline each detected section, and draw medium and low
   *  alike as "needs review", which is all its legend distinguishes. */
  outlineSections?: boolean;
  /** Draws only the first N items per section — the upload screen's preview
   *  is a glimpse that sits beside three cards, not the full page. */
  maxItems?: number;
  className?: string;
}

/** Sections for one page: the menu split into `pages` balanced runs. */
export function sectionsOnPage(result: DetectionResult, page: number): DetectedSection[] {
  return splitBalanced(result.sections, result.pages)[page] ?? [];
}

export function PaperMenu({
  result,
  columns,
  page = 0,
  revealed,
  revealedSections,
  selectedId,
  onSelect,
  outlineSections,
  maxItems,
  className,
}: PaperMenuProps) {
  const { t } = useI18n();
  const onPage = sectionsOnPage(result, page);
  const cols = splitBalanced(onPage, columns);

  return (
    // A printed page keeps its own direction: an English menu does not mirror
    // when the console is in Arabic, just as the PDF would not.
    <div
      dir="ltr"
      className={clsx(
        "relative overflow-hidden rounded-[10px] px-5 pb-6 pt-5 text-[#2b2520] shadow-[inset_0_0_60px_rgb(120_90_50/0.18)] sm:px-7",
        "bg-[radial-gradient(ellipse_at_30%_20%,#fbf6ec_0%,#f3eadb_55%,#eadcc6_100%)]",
        className
      )}
    >
      <Leaves className="-start-3 -top-4 h-28 w-24 -scale-x-100 rotate-[160deg]" />
      <Leaves className="-end-4 top-8 h-36 w-28" />
      <Leaves className="-bottom-6 -end-2 h-24 w-20 rotate-[200deg] opacity-70" />

      <header className="relative text-center">
        <Crest />
        <p className="mt-1 font-serif text-[22px] uppercase tracking-[0.18em] text-[#2b2520] sm:text-[26px]">
          {result.restaurant.name}
        </p>
        <p className="font-serif text-[10px] uppercase tracking-[0.4em] text-[#4a3f36]">{result.restaurant.tagline}</p>
        <div className="mx-auto mt-3 h-px w-4/5 bg-[#c9b48f]" />
      </header>

      <div
        className={clsx(
          "relative mt-4 grid gap-x-5 gap-y-2",
          columns === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
        )}
      >
        {cols.map((col, c) => (
          <div
            key={c}
            className={clsx("min-w-0 space-y-4", c > 0 && "sm:border-s sm:border-[#d9c7a6] sm:ps-5")}
          >
            {col.map((section) => {
              const sectionIndex = result.sections.indexOf(section);
              const sectionShown = revealedSections === undefined || sectionIndex < revealedSections;
              return (
                <div
                  key={section.id}
                  className={clsx(
                    "rounded-[8px] transition-colors",
                    outlineSections && sectionShown && "border-2 border-dashed border-[rgb(124_58_237/0.35)] p-1.5"
                  )}
                >
                  <h3 className="border-b border-[#d9c7a6] pb-1 font-serif text-[15px] font-semibold uppercase tracking-[0.06em] text-[#8a5a2b]">
                    {section.name}
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {(maxItems ? section.items.slice(0, maxItems) : section.items).map((item) => {
                      const shown = !revealed || revealed.has(item.id);
                      const band = bandFor(item.confidence);
                      const tone = BAND_TONE[outlineSections && band === "low" ? "medium" : band];
                      const selected = selectedId === item.id;
                      const price =
                        item.price === null ? t("menuAi.paper.priceUnclear") : `SAR ${item.price}`;
                      const body = (
                        <>
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-[12px] font-semibold leading-snug text-[#221c17]">{item.name}</span>
                            <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-[#221c17]">{price}</span>
                          </span>
                          {item.description && (
                            <span className="mt-0.5 block text-[10.5px] leading-snug text-[#5a4e44]">
                              {item.description}
                            </span>
                          )}
                          {shown && !outlineSections && (
                            <span
                              className={clsx(
                                "mt-1 ms-auto block w-fit rounded-[4px] border bg-white/80 px-1.5 text-[9.5px] font-semibold tabular-nums",
                                tone.ink,
                                selected ? "border-[#3D1DF3]/40" : "border-current/20"
                              )}
                            >
                              {item.confidence}%
                            </span>
                          )}
                        </>
                      );
                      const boxClass = clsx(
                        "block w-full rounded-[6px] border-[1.5px] border-dashed px-2 py-1.5 text-start transition-all",
                        shown ? tone.box : "border-transparent opacity-45",
                        selected &&
                          "border-solid !border-[#3D1DF3] !bg-[rgb(61_29_243/0.1)] shadow-[0_2px_10px_rgb(61_29_243/0.25)]"
                      );
                      return (
                        <li key={item.id}>
                          {onSelect && shown ? (
                            <button
                              type="button"
                              data-paper-item={item.id}
                              aria-pressed={selected}
                              onClick={() => onSelect(item.id)}
                              className={clsx(boxClass, "hover:shadow-[0_2px_8px_rgb(61_29_243/0.18)]")}
                            >
                              {body}
                            </button>
                          ) : (
                            <div className={boxClass}>{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
