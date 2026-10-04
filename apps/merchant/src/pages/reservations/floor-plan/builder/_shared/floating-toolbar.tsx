import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { BORDER_200, BORDER_300, SURFACE_WHITE, TEXT_PRIMARY } from "../../../_shared/theme";

export interface FloatingTool {
  id: string;
  label: string;
  icon: ReactNode;
  /** Ignored when `menu` is set — the button opens the menu instead. */
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  tone?: "danger";
  /** Tucked behind the "More" button instead of shown as its own button —
   *  for tools reached rarely enough that they don't need a seat on the bar. */
  overflow?: boolean;
  /** Renders a popover above the button on click instead of firing an action
   *  directly — for a tool that's really a small settings panel (Grid). */
  menu?: (close: () => void) => ReactNode;
  /** A thin divider rendered before this tool, to group the bar (or the More
   *  list) visually. */
  separator?: boolean;
  /** Overflow-only: custom content rendered in the "More" list in place of a
   *  clickable row — for a setting that isn't a single action (Grid's step
   *  picker, or a cluster of related toggles). */
  overflowContent?: ReactNode;
}

const ACTIVE = "border-[#0d6efd] bg-[#f5f9ff] text-[#0d6efd] [[data-theme=dark]_&]:border-[var(--octo-accent)] [[data-theme=dark]_&]:bg-[var(--octo-selected)] [[data-theme=dark]_&]:text-[var(--octo-accent)]";
const IDLE = clsx(BORDER_300, SURFACE_WHITE, TEXT_PRIMARY);
const HOVER = "hover:bg-[#f8fafc] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]";
const BUTTON = "flex h-[34px] shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2 text-[16px] font-medium leading-4 transition-colors disabled:cursor-not-allowed disabled:opacity-45";
const DIVIDER = "absolute -start-[6.5px] top-1/2 h-6 w-px -translate-y-1/2 bg-[#cbd5e1] [[data-theme=dark]_&]:bg-[var(--octo-border-input)]";
const TOOLTIP =
  "pointer-events-none absolute bottom-full start-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-[11.5px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tool:opacity-100 rtl:translate-x-1/2";

const toneClasses = (tool: Pick<FloatingTool, "active" | "tone">) =>
  tool.active ? ACTIVE : tool.tone === "danger" ? clsx(IDLE, "hover:border-[#EF4444]/50 hover:text-[#DC2626]") : clsx(IDLE, HOVER);

/** A labelled pill button, icon first. Its keyboard shortcut shows in a small
 *  tooltip above it on hover. A tool with `menu` opens a popover above itself
 *  instead of firing onClick. */
function ToolButton({ tool }: { tool: FloatingTool }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="group/tool relative shrink-0" ref={ref}>
      {tool.separator && <span className={DIVIDER} />}
      <button
        type="button"
        onClick={() => (tool.menu ? setOpen((o) => !o) : tool.onClick?.())}
        disabled={tool.disabled}
        aria-pressed={tool.menu ? undefined : (tool.active ?? undefined)}
        aria-expanded={tool.menu ? open : undefined}
        aria-haspopup={tool.menu ? "menu" : undefined}
        aria-label={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
        className={clsx(BUTTON, toneClasses({ ...tool, active: tool.active || open }))}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center">{tool.icon}</span>
        {tool.label}
      </button>
      {!open && tool.shortcut && (
        <span role="tooltip" className={TOOLTIP}>
          {`${tool.label} (${tool.shortcut})`}
        </span>
      )}
      {tool.menu && open && (
        <div
          role="menu"
          className={clsx("absolute bottom-full start-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded-xl border p-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)] rtl:translate-x-1/2", BORDER_200, SURFACE_WHITE)}
        >
          {tool.menu(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** The rounded, shadowed bar of tools under the canvas. Tools flagged
 *  `overflow` are hidden behind a "More" menu instead of crowding the bar; a
 *  tool with `menu` opens its own small popover (e.g. Grid). */
export function FloatingToolbar({ tools, className }: { tools: FloatingTool[]; className?: string }) {
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const visible = tools.filter((tool) => !tool.overflow);
  const overflow = tools.filter((tool) => tool.overflow);
  const overflowActive = overflow.some((tool) => tool.active);

  return (
    <div
      role="toolbar"
      className={clsx("mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-3 rounded-[24px] p-4 shadow-[0_0_12px_0_rgba(0,0,0,0.12)]", SURFACE_WHITE, className)}
    >
      {visible.map((tool) => (
        <ToolButton key={tool.id} tool={tool} />
      ))}

      {overflow.length > 0 && (
        <div className="group/tool relative shrink-0" ref={moreRef}>
          <span className={DIVIDER} />
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            className={clsx(BUTTON, overflowActive || moreOpen ? ACTIVE : clsx(IDLE, HOVER))}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center">
              <MoreHorizontal size={20} />
            </span>
            {t("floorPlan.toolbar.more")}
          </button>
          {moreOpen && (
            <div
              role="menu"
              className={clsx("absolute bottom-full end-0 z-20 mb-2 flex w-max flex-col gap-0.5 rounded-xl border p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]", BORDER_200, SURFACE_WHITE)}
            >
              {overflow.map((tool) => (
                <div key={tool.id}>
                  {tool.separator && <div className="my-1 h-px bg-[#e2e8f0] [[data-theme=dark]_&]:bg-[var(--octo-border-input)]" />}
                  {tool.overflowContent ?? (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={tool.disabled}
                      onClick={() => {
                        tool.onClick?.();
                        setMoreOpen(false);
                      }}
                      className={clsx(
                        "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-start text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                        tool.active ? ACTIVE.replace("border-[#0d6efd] ", "") : clsx(TEXT_PRIMARY, HOVER)
                      )}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center">{tool.icon}</span>
                      {tool.label}
                      {tool.shortcut && (
                        <kbd className="ms-auto rounded-md border border-[var(--octo-border-input)] bg-[var(--octo-seg-bg)] px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-[var(--octo-text-secondary)]">
                          {tool.shortcut}
                        </kbd>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
