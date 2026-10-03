import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

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
  /** Tucked behind the "More" button instead of shown as its own icon —
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

const toneClasses = (tool: Pick<FloatingTool, "active" | "tone">) =>
  tool.active
    ? "border-[#6366F1] bg-[#6366F1]/10 text-[#4F46E5]"
    : tool.tone === "danger"
      ? "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:border-[#EF4444]/50 hover:text-[#DC2626]"
      : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]";

/** An icon button that shows its name in a small tooltip above it on hover —
 *  the bar stays a row of icons instead of growing with each tool's label.
 *  A tool with `menu` opens a popover above itself instead of firing onClick. */
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
    <div className="group/tool relative" ref={ref}>
      {tool.separator && <span className="absolute -start-[7px] top-1/2 h-6 w-px -translate-y-1/2 bg-[var(--octo-border-input)]" />}
      <button
        type="button"
        onClick={() => (tool.menu ? setOpen((o) => !o) : tool.onClick?.())}
        disabled={tool.disabled}
        aria-pressed={tool.menu ? undefined : (tool.active ?? undefined)}
        aria-expanded={tool.menu ? open : undefined}
        aria-haspopup={tool.menu ? "menu" : undefined}
        aria-label={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
        className={clsx(
          "grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border transition-colors disabled:cursor-not-allowed disabled:opacity-45",
          toneClasses({ ...tool, active: tool.active || open })
        )}
      >
        {tool.icon}
      </button>
      {!open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full start-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-[11.5px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tool:opacity-100 rtl:translate-x-1/2"
        >
          {tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
        </span>
      )}
      {tool.menu && open && (
        <div
          role="menu"
          className="absolute bottom-full start-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)] rtl:translate-x-1/2"
        >
          {tool.menu(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** The rounded bar of tools floating over the canvas. Tools flagged
 *  `overflow` are hidden behind an icon-only "More" menu instead of crowding
 *  the bar; a tool with `menu` opens its own small popover (e.g. Grid). */
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
      className={clsx(
        "mx-auto flex w-fit max-w-full items-center gap-1.5 rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2.5 py-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {visible.map((tool) => (
        <ToolButton key={tool.id} tool={tool} />
      ))}

      {overflow.length > 0 && (
        <div className="group/tool relative" ref={moreRef}>
          <span className="absolute -start-[7px] top-1/2 h-6 w-px -translate-y-1/2 bg-[var(--octo-border-input)]" />
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-label={t("floorPlan.toolbar.more")}
            className={clsx(
              "grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border transition-colors",
              overflowActive || moreOpen
                ? "border-[#6366F1] bg-[#6366F1]/10 text-[#4F46E5]"
                : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            )}
          >
            <MoreHorizontal size={20} />
          </button>
          {!moreOpen && (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full start-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-[11.5px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tool:opacity-100 rtl:translate-x-1/2"
            >
              {t("floorPlan.toolbar.more")}
            </span>
          )}
          {moreOpen && (
            <div
              role="menu"
              className="absolute bottom-full end-0 z-20 mb-2 flex w-max flex-col gap-0.5 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
            >
              {overflow.map((tool) => (
                <div key={tool.id}>
                  {tool.separator && <div className="my-1 h-px bg-[var(--octo-border-input)]" />}
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
                        "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-start text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                        tool.active ? "bg-[#6366F1]/10 font-medium text-[#4F46E5]" : "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
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
