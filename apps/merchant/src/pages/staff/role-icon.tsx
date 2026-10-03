import clsx from "clsx";
import { StaffIcon } from "./_shared/icon";
import { FILL_BLUE, INK, INK_LINK } from "./_shared/theme";

// The roles list's own glyphs. A few are exported smaller than their 20px box,
// so they carry the drawn size to stay unscaled.
const ROLE_ICONS: Record<string, { name: string; glyph?: [number, number] }> = {
  owner: { name: "staff-role-crown.svg" },
  manager: { name: "staff-role-user-20.svg" },
  cashier: { name: "staff-role-cashier.svg", glyph: [16.83, 16.83] },
  host: { name: "staff-role-appointment.svg", glyph: [16.25, 17.92] },
  kitchen: { name: "staff-role-chef.svg" },
  barista: { name: "staff-role-coffee.svg" },
  custom: { name: "staff-role-marketing.svg", glyph: [17.92, 17.92] },
};
const FALLBACK = { name: "staff-shield.svg", glyph: undefined };

export function RoleIcon({ roleId, highlighted, className }: { roleId: string; highlighted?: boolean; className?: string }) {
  const icon = ROLE_ICONS[roleId] ?? FALLBACK;
  return (
    <span
      aria-hidden
      className={clsx(
        "grid h-8 w-8 shrink-0 place-items-center rounded-[4px]",
        highlighted ? clsx(FILL_BLUE, INK_LINK) : clsx("bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-hover)]", INK),
        className
      )}
    >
      <StaffIcon name={icon.name} size={20} glyph={icon.glyph} />
    </span>
  );
}
