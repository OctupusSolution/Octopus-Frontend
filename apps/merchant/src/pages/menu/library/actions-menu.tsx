// The card kebab. Held menus offer Resume where active ones offer Hold — the
// same slot, because they are the same decision in two directions.
//
// Anchored to the button that opened it, not centred on the screen: the frame
// draws it hanging off its own card's kebab, and a centred sheet loses the one
// thing the merchant needs to know — which of nine identical-looking cards they
// are about to archive.
import type { Menu } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { PopoverMenu } from "../_shared/controls";
import type { CardAction } from "./menu-card";

export function ActionsMenu({
  menu,
  anchor,
  onClose,
  onPick,
}: {
  menu: Menu | null;
  anchor: DOMRect | null;
  onClose: () => void;
  onPick: (action: CardAction) => void;
}) {
  const { t } = useI18n();
  if (!menu || !anchor) return null;

  // The frame's six rows and nothing else. Version history, access codes, bulk
  // pricing and unpublish still exist behind `CardAction`; they are simply not
  // offered here until the design gives them a home.
  const actions: CardAction[] = [
    "edit",
    "schedule",
    menu.status === "on-hold" ? "resume" : "hold",
    "duplicate",
    "archive",
    "delete",
  ];

  return (
    <PopoverMenu
      anchor={anchor}
      onClose={onClose}
      onPick={onPick}
      items={actions.map((action) => ({
        id: action,
        label: t(`menuLib.action.${action}`),
        danger: action === "delete",
      }))}
    />
  );
}
