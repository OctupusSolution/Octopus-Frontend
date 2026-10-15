import { TableIcon } from "./table-icon";

/** The design system's radio, as drawn. Purely visual: the row it sits in is the control. */
export function TableRadio({ checked }: { checked: boolean }) {
  return <TableIcon name={checked ? "radio-on" : "radio-off"} />;
}
