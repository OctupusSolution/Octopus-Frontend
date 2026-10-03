import type { CSSProperties } from "react";
import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import {
  estimatedSeatingMinutes,
  formatJoined,
  fullName,
  isActive,
  queuePosition,
  waitedMinutes,
  type WaitlistEntry,
} from "@/entities/waitlist-entry";
import { useI18n } from "@/app/providers/i18n-provider";
import { useWaitlistExtraText } from "./_shared/extra-text";
import { ChannelGlyph } from "./_shared/glyphs";
import { apiStatusOf } from "./_shared/waitlist-api";
import { STATUS_KEY, STATUS_TONE } from "./_shared/labels";
import { INK, LINE_SOFT, SURFACE, TINT_CLASS } from "./_shared/theme";
import { WaitlistIcon, WaitlistImg } from "./_shared/waitlist-icon";
import { WaitlistRowMenu } from "./row-menu";

export interface RowHandlers {
  onSeat: (entry: WaitlistEntry) => void;
  onCall: (entry: WaitlistEntry) => void;
  onNotify: (entry: WaitlistEntry) => void;
  onRemove: (entry: WaitlistEntry) => void;
  onEdit: (entry: WaitlistEntry) => void;
  onMoveUp: (entry: WaitlistEntry) => void;
  onHistory: (entry: WaitlistEntry) => void;
  onRevertReady: (entry: WaitlistEntry) => void;
  onReinstate: (entry: WaitlistEntry) => void;
}

// The frame's cells: a 36px header band and 56px rows, both in 12px type.
const TH = clsx(INK, "h-9 whitespace-nowrap px-2 text-center text-[12px] font-medium capitalize leading-[12px]");
const TD = clsx(INK, "h-14 whitespace-nowrap px-1 text-center text-[12px] font-normal leading-[12px]");
const ICON_BTN = "grid h-8 w-10 shrink-0 place-items-center rounded-[8px] transition-colors disabled:cursor-not-allowed disabled:opacity-40";

/** The guest and trailing columns keep the frame's widths; the columns between
 *  them share what is left, so they sit in the middle on a wide screen. */
const COLUMNS: readonly { key: string; width?: number }[] = [
  { key: "guest", width: 238 },
  { key: "partySize" },
  { key: "joined", width: 143 },
  { key: "waittime" },
  { key: "estSeating" },
  { key: "area" },
  { key: "status", width: 103 },
  { key: "actions", width: 299 },
];

function Box({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "grid h-[13px] w-[13px] place-items-center rounded-[2px] border transition-colors",
        checked || indeterminate ? "border-[#0D6EFD] bg-[#0D6EFD] text-white" : "border-[#767676] bg-white [[data-theme=dark]_&]:border-[var(--octo-text-muted)] [[data-theme=dark]_&]:bg-[var(--octo-card)]"
      )}
    >
      {indeterminate ? <Minus size={9} strokeWidth={4} /> : checked && <Check size={9} strokeWidth={4} />}
    </button>
  );
}

export function StatusPill({ entry }: { entry: WaitlistEntry }) {
  const { t } = useI18n();
  const tone = STATUS_TONE[entry.status];
  return (
    <span
      style={{ "--tint-fg": tone.text, "--tint-bg": tone.bg } as CSSProperties}
      className={clsx(TINT_CLASS, "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-[12px]")}
    >
      <span className="h-[5px] w-[5px] rounded-full bg-current" />
      {t(STATUS_KEY[entry.status])}
    </span>
  );
}

export function WaitlistTable({
  rows,
  allEntries,
  now,
  selected,
  onSelectedChange,
  openMenuId,
  onOpenMenuChange,
  handlers,
}: {
  rows: readonly WaitlistEntry[];
  allEntries: readonly WaitlistEntry[];
  now: number;
  selected: ReadonlySet<string>;
  onSelectedChange: (next: Set<string>) => void;
  openMenuId: string | null;
  onOpenMenuChange: (id: string | null) => void;
  handlers: RowHandlers;
}) {
  const { t, locale } = useI18n();
  const text = useWaitlistExtraText();
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = !allSelected && rows.some((r) => selected.has(r.id));
  const minutes = (n: number) => `${n} ${t("waitlist.min")}`;

  return (
    <div className={clsx(SURFACE, LINE_SOFT, "octo-scroll overflow-x-auto rounded-[12px] border")}>
      <table className="w-full min-w-[1180px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: 41 }} />
          {COLUMNS.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b-[0.8px] border-[#E2E8F0] bg-[#F8FAFC] [[data-theme=dark]_&]:border-[var(--octo-border-card)] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]">
            <th className="h-9 px-[14px]">
              <Box
                checked={allSelected}
                indeterminate={someSelected}
                label={t("waitlist.table.selectAll")}
                onChange={() => onSelectedChange(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
              />
            </th>
            {COLUMNS.map((column) => (
              <th key={column.key} className={TH}>
                {t(`waitlist.table.${column.key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const active = isActive(entry);
            const position = queuePosition(allEntries, entry.id);
            const est = estimatedSeatingMinutes(allEntries, entry, now);
            const waited = waitedMinutes(entry, now);
            const checked = selected.has(entry.id);
            const name = fullName(entry);
            return (
              <tr
                key={entry.id}
                className={clsx(
                  "border-b-[0.8px] border-[#F1F5F9] transition-colors last:border-0 [[data-theme=dark]_&]:border-[var(--octo-row-border)]",
                  checked ? "bg-[#F5F9FF] [[data-theme=dark]_&]:bg-[var(--octo-tone-info-bg)]" : "hover:bg-[#F8FAFC] [[data-theme=dark]_&]:hover:bg-[var(--octo-row-hover)]"
                )}
              >
                <td className="h-14 px-[14px]">
                  <Box
                    checked={checked}
                    label={name}
                    onChange={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(entry.id);
                      else next.add(entry.id);
                      onSelectedChange(next);
                    }}
                  />
                </td>
                <td className={TD}>
                  <div className="flex flex-col items-center gap-2">
                    <p>{name}</p>
                    <p className="flex items-center gap-1.5">
                      <ChannelGlyph channel={entry.channel} />
                      <span dir="ltr">{entry.phone}</span>
                    </p>
                  </div>
                </td>
                <td className={TD}>{entry.partySize}</td>
                <td className={TD}>{formatJoined(entry.joinedAt, locale, t("waitlist.at"))}</td>
                <td className={clsx(TD, active && waited > entry.quotedMin && "!text-[#D30202]")}>{minutes(waited)}</td>
                <td className={TD}>{est === null ? "—" : minutes(est)}</td>
                <td className={TD}>{entry.status === "seated" && entry.seatedTable ? `${entry.seatedArea} · ${entry.seatedTable}` : entry.areaPreference || "—"}</td>
                <td className={TD}>
                  <StatusPill entry={entry} />
                </td>
                <td className="h-14 px-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={!active}
                      onClick={() => handlers.onSeat(entry)}
                      title={active && position ? `${t("waitlist.action.seat")} · #${position}` : t("waitlist.action.seat")}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] bg-[#0D6EFD] px-3 text-[14px] font-medium leading-[14px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <WaitlistImg name="done.svg" />
                      {t("waitlist.action.seat")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlers.onCall(entry)}
                      title={t("waitlist.action.call")}
                      aria-label={`${t("waitlist.action.call")} ${name}`}
                      className={clsx(ICON_BTN, "bg-[#F5F9FF] text-[#004BB9] hover:bg-[#E6F0FF] [[data-theme=dark]_&]:bg-[var(--octo-tone-info-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]")}
                    >
                      <WaitlistIcon name="call.svg" />
                    </button>
                    <button
                      type="button"
                      disabled={!active}
                      onClick={() => handlers.onNotify(entry)}
                      title={t("waitlist.action.notify")}
                      aria-label={`${t("waitlist.action.notify")} ${name}`}
                      className={clsx(ICON_BTN, "bg-[#FFF5E4] text-[#DE9000] hover:bg-[#FFEBC8] [[data-theme=dark]_&]:bg-[var(--octo-tone-warning-bg)]")}
                    >
                      <WaitlistIcon name="share.svg" />
                    </button>
                    <button
                      type="button"
                      disabled={!active}
                      onClick={() => handlers.onRemove(entry)}
                      title={t("waitlist.action.remove")}
                      aria-label={`${t("waitlist.action.remove")} ${name}`}
                      className={clsx(ICON_BTN, "bg-[#FEF0F0] text-[#D30202] hover:bg-[#FDDCDC] [[data-theme=dark]_&]:bg-[var(--octo-tone-danger-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-danger-text)]")}
                    >
                      <WaitlistIcon name="error.svg" />
                    </button>
                    <WaitlistRowMenu
                      open={openMenuId === entry.id}
                      onOpenChange={(open) => onOpenMenuChange(open ? entry.id : null)}
                      canEdit={active}
                      canMoveUp={active && (position ?? 1) > 1}
                      onEdit={() => handlers.onEdit(entry)}
                      onMoveUp={() => handlers.onMoveUp(entry)}
                      onViewHistory={() => handlers.onHistory(entry)}
                      extraItems={[
                        ...(apiStatusOf(entry.id) === "Ready"
                          ? [{ label: text.revertReady, onSelect: () => handlers.onRevertReady(entry) }]
                          : []),
                        ...(apiStatusOf(entry.id) === "NoShow"
                          ? [{ label: text.reinstate, onSelect: () => handlers.onReinstate(entry) }]
                          : []),
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
