import { Calculator, CalendarCheck, ChefHat, Coffee, Crown, Megaphone, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import clsx from "clsx";

const ROLE_ICONS: Record<string, LucideIcon> = {
  owner: Crown,
  manager: UserRound,
  cashier: Calculator,
  host: CalendarCheck,
  kitchen: ChefHat,
  barista: Coffee,
  custom: Megaphone,
};

export function RoleIcon({ roleId, highlighted, className }: { roleId: string; highlighted?: boolean; className?: string }) {
  const Icon = ROLE_ICONS[roleId] ?? ShieldCheck;
  return (
    <span
      aria-hidden
      className={clsx(
        "grid h-9 w-9 shrink-0 place-items-center rounded-[8px]",
        highlighted ? "bg-[var(--octo-tone-info-bg)] text-[#0D6EFD]" : "bg-[var(--octo-hover)] text-[var(--octo-text-primary)]",
        className
      )}
    >
      <Icon size={18} strokeWidth={1.8} />
    </span>
  );
}
