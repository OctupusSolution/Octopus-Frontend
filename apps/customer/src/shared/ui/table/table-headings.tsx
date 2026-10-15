import Link from "next/link";
import { TableIcon } from "./table-icon";

export interface TableSectionTitleProps {
  title: string;
  /** Anchor target for the footer's in-page links. */
  id?: string;
}

export function TableSectionTitle({ title, id }: TableSectionTitleProps) {
  return (
    <h2
      id={id}
      className="scroll-mt-4 border-s-[3px] border-ocean-blue px-2 text-[20px] font-bold leading-none text-gray-900"
    >
      {title}
    </h2>
  );
}

export interface TableBackTitleProps {
  title: string;
  backHref: string;
  backLabel: string;
  /** The "(500)" beside a listing's title. */
  count?: number;
}

/** A screen's title with the back control at its inline start. The arrow is
 *  drawn pointing right, which is "back" in Arabic; it mirrors for English. */
export function TableBackTitle({ title, backHref, backLabel, count }: TableBackTitleProps) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="flex size-10 shrink-0 items-center rounded-[12px] p-2"
      >
        <TableIcon name="back-square" className="ltr:-scale-x-100" />
      </Link>
      <h1 className="text-[18px] font-bold leading-none text-gray-900">
        {title}
        {count !== undefined && <span className="text-[12px] font-normal"> ({count})</span>}
      </h1>
    </div>
  );
}
