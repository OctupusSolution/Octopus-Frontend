// The pieces the Items frames repeat that the module kit does not already
// have: the 4px-radius field these frames draw (the kit's is 12px), the pale
// blue "add" button, the radio row and the grey masked empty-state art.
import clsx from "clsx";
import type { ReactNode } from "react";
import { menuAsset } from "@/shared/lib/menu-assets";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_BORDER, FOCUS, FOCUS_WITHIN, SURFACE_BLUE, TEXT, TEXT_GRAY } from "../../_shared/theme";

/** 40px input with the Items frames' 4px corners. */
export const FIELD_4 = `h-10 w-full rounded-[4px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 text-[14px] ${TEXT} placeholder:text-[#58606c] ${FOCUS}`;
/** The same box when it wraps a prefix and a bare input ("SAR | Enter price"). */
export const FIELD_4_BOX = `flex h-10 w-full items-center gap-2 rounded-[4px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 text-[14px] ${TEXT} ${FOCUS_WITHIN}`;
export const BARE_INPUT = `min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#58606c] ${TEXT}`;
/** Squares a SelectBox's corners to match FIELD_4. */
export const SELECT_4 = "[&>select]:!rounded-[4px]";

/** The frames' blue label (#0058da) and their price blue (#004bb9). */
export const ACCENT_TEXT = "text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]";
export const PRICE_TEXT = "text-[#004bb9] [[data-theme=dark]_&]:text-[#8ab8ff]";

/** "Add New Item", "Add Option", "Add Allergens": pale blue, 4px radius. */
export const ADD_BUTTON = `flex items-center justify-center gap-3 rounded-[4px] border border-[#0D6EFD] p-2 text-[14px] font-semibold leading-[14px] text-[#0D6EFD] hover:brightness-95 ${SURFACE_BLUE}`;
/** "Change Image", "Upload Video": 36px, outlined, bold 12px. */
export const OUTLINE_36 =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#0D6EFD] px-3 text-[12px] font-bold leading-3 text-[#0D6EFD] hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[#0d6efd]/15";
/** The 36px pale-red trash square. */
export const TRASH_36 =
  "grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#fef0f0] text-[#d30202] hover:brightness-95 [[data-theme=dark]_&]:bg-[#d30202]/15 [[data-theme=dark]_&]:text-[#ff6b6b]";

export const LABEL_12 = `text-[12px] font-medium leading-3 ${TEXT}`;
export const LABEL_14 = `text-[14px] font-medium leading-[14px] ${TEXT}`;
export const LABEL_16 = `text-[16px] font-medium leading-4 ${TEXT}`;

/** The red line under a field that failed validation. */
export function FieldError({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <span role="alert" className={clsx("text-[12px] leading-[14px] text-[#d30202]", className)}>
      {children}
    </span>
  );
}

/** The frames' 24px radio glyph and its 14px label. The native input stays in
 *  the tree (visually hidden) for keyboard and screen readers. */
export function RadioRow({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="inline-flex rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-[#0D6EFD]/40">
        <RadioGlyph checked={checked} />
      </span>
      <span className={clsx("text-[14px] font-medium leading-[14px]", checked ? ACCENT_TEXT : TEXT_GRAY)}>{children}</span>
    </label>
  );
}

export function RadioGlyph({ checked }: { checked: boolean }) {
  return (
    <MenuIcon
      name={checked ? "menu-radio-on.svg" : "menu-radio-off.svg"}
      size={24}
      className={checked ? "text-[#0D6EFD]" : "text-[#64748b]"}
    />
  );
}

export function CheckGlyph({ checked }: { checked: boolean }) {
  return (
    <MenuIcon
      name={checked ? "menu-checkbox-on.svg" : "menu-checkbox-off.svg"}
      size={24}
      className={checked ? "text-[#0D6EFD]" : "text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]"}
    />
  );
}

const ART = {
  modifiers: menuAsset("menu-empty-modifiers.png"),
  editGroup: menuAsset("menu-empty-edit-group.png"),
} as const;

/** The empty states' line art: the frame's image used as a mask over the
 *  outline grey, so it follows the theme like every other glyph here. */
export function EmptyArt({ art, size }: { art: keyof typeof ART; size: number }) {
  const mask = `url("${ART[art]}") center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className="block shrink-0 bg-[#cbd5e1] [[data-theme=dark]_&]:bg-[var(--octo-border-input)]"
      style={{ width: size, height: size, WebkitMask: mask, mask }}
    />
  );
}

/** Art, a bold 14px line and a grey 12px one, centred. */
export function EmptyBlock({
  art,
  size,
  gap,
  title,
  body,
}: {
  art: keyof typeof ART;
  size: number;
  gap: "gap-2" | "gap-4";
  title: string;
  body: string;
}) {
  return (
    <div className={clsx("flex w-full flex-col items-center text-center", gap)}>
      <EmptyArt art={art} size={size} />
      <div>
        <p className={clsx("text-[14px] font-bold leading-[1.4]", TEXT)}>{title}</p>
        <p className={clsx("text-[12px] font-medium leading-[1.4]", TEXT_GRAY)}>{body}</p>
      </div>
    </div>
  );
}
