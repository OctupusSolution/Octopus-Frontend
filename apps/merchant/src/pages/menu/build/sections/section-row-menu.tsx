// The section row's kebab: Edit / Archived (or Restore) / Delete.
//
// Anchored to the row's own button rather than centred — a sheet over a list
// of six near-identical rows loses which row you were on. The built-in offers
// section offers no Delete.
import { OFFERS_SECTION_ID, type Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { PopoverMenu, type PopoverItem } from "../../_shared/controls";

export type SectionAction = "edit" | "archive" | "restore" | "delete";

export function SectionRowMenu({
  section,
  anchor,
  onClose,
  onPick,
}: {
  section: Section | null;
  anchor: DOMRect | null;
  onClose: () => void;
  onPick: (action: SectionAction) => void;
}) {
  const { t } = useI18n();
  if (!section || !anchor) return null;

  // An archived row swaps Archived for Restore; archiving it twice means nothing.
  const actions: SectionAction[] = [
    "edit",
    section.visibility === "archived" ? "restore" : "archive",
    ...(section.id === OFFERS_SECTION_ID ? [] : (["delete"] as const)),
  ];
  const items: PopoverItem<SectionAction>[] = actions.map((action) => ({
    id: action,
    label: t(`menuWiz.sec.action.${action}`),
    danger: action === "delete",
  }));

  return <PopoverMenu anchor={anchor} items={items} onPick={onPick} onClose={onClose} />;
}
