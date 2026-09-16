import clsx from "clsx";
import { Check, CircleCheck, CircleX, Minus, Phone, Send } from "lucide-react";
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
import { ChannelGlyph } from "./_shared/glyphs";
import { STATUS_KEY, STATUS_TONE } from "./_shared/labels";
import { WaitlistRowMenu } from "./row-menu";

export interface RowHandlers {
  onSeat: (entry: WaitlistEntry) => void;
  onCall: (entry: WaitlistEntry) => void;
  onNotify: (entry: WaitlistEntry) => void;
  onRemove: (entry: WaitlistEntry) => void;
  onEdit: (entry: WaitlistEntry) => void;
  onMoveUp: (entry: WaitlistEntry) => void;
  onHistory: (entry: WaitlistEntry) => void;
}

const TH = "whitespace-nowrap px-2 py-3 2xl:px-2.5 text-center text-[13.5px] font-medium text-[var(--octo-text-primary)]";
const TD = "whitespace-nowrap px-2 py-3 2xl:px-2.5 text-center text-[13.5px] text-[var(--octo-text-primary)]";
const ICON_BTN = "grid h-8 w-10 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40";

function Box({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "grid h-[18px] w-[18px] place-items-center rounded-[4px] border transition-colors",
        checked || indeterminate ? "border-[#0D6EFD] bg-[#0D6EFD] text-white" : "border-[var(--octo-text-muted)] bg-[var(--octo-card)]"
      )}
    >
      {indeterminate ? <Minus size={12} strokeWidth={3} /> : checked && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

export function StatusPill({ entry }: { entry: WaitlistEntry }) {
  const { t } = useI18n();
  const tone = STATUS_TONE[entry.status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-medium" style={{ backgroundColor: tone.bg, color: tone.text }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.dot }} />
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
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = !allSelected && rows.some((r) => selected.has(r.id));
  const minutes = (n: number) => `${n} ${t("waitlist.min")}`;

  const headers = ["guest", "partySize", "joined", "waittime", "estSeating", "area", "status", "actions"];

  return (
    <div className="octo-scroll overflow-x-auto rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <table className="w-full min-w-[1080px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)]">
            <th className="w-12 px-4 py-3">
              <Box
                checked={allSelected}
                indeterminate={someSelected}
                label={t("waitlist.table.selectAll")}
                onChange={() => onSelectedChange(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
              />
            </th>
            {headers.map((h) => (
              <th key={h} className={TH}>
                {t(`waitlist.table.${h}`)}
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
                  "border-b border-[var(--octo-row-border)] last:border-0 transition-colors",
                  checked ? "bg-[var(--octo-tone-info-bg)]" : "hover:bg-[var(--octo-row-hover)]"
                )}
              >
                <td className="px-4 py-3">
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
                  <p className="font-normal">{name}</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-[13.5px]">
                    <ChannelGlyph channel={entry.channel} />
                    <span dir="ltr">{entry.phone}</span>
                  </p>
                </td>
                <td className={TD}>{entry.partySize}</td>
                <td className={TD}>{formatJoined(entry.joinedAt, locale, t("waitlist.at"))}</td>
                <td className={clsx(TD, active && waited > entry.quotedMin && "text-[var(--octo-tone-danger-text)]")}>{minutes(waited)}</td>
                <td className={TD}>{est === null ? "—" : minutes(est)}</td>
                <td className={TD}>{entry.status === "seated" && entry.seatedTable ? `${entry.seatedArea} · ${entry.seatedTable}` : entry.areaPreference || "—"}</td>
                <td className={TD}>
                  <StatusPill entry={entry} />
                </td>
                <td className="px-2 py-3 2xl:px-2.5">
                  <div className="flex items-center justify-center gap-1.5 2xl:gap-2">
                    <button
                      type="button"
                      disabled={!active}
                      onClick={() => handlers.onSeat(entry)}
                      title={active && position ? `${t("waitlist.action.seat")} · #${position}` : t("waitlist.action.seat")}
                      className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#0D6EFD] pe-4 ps-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CircleCheck size={20} fill="#fff" className="text-[#0D6EFD]" strokeWidth={2.2} />
                      {t("waitlist.action.seat")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlers.onCall(entry)}
                      title={t("waitlist.action.call")}
                      aria-label={`${t("waitlist.action.call")} ${name}`}
                      className={clsx(ICON_BTN, "bg-[color-mix(in_srgb,#0D6EFD_5%,var(--octo-card))] text-[#0B4FC0] hover:bg-[var(--octo-tone-info-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]")}
                    >
                      <Phone size={18} strokeWidth={1.6} />
                    </button>
                    <button
                      type="button"
                      disabled={!active}
                      onClick={() => handlers.onNotify(entry)}
                      title={t("waitlist.action.notify")}
                      aria-label={`${t("waitlist.action.notify")} ${name}`}
                      className={clsx(ICON_BTN, "bg-[var(--octo-tone-warning-bg)] text-[#E3A008] hover:bg-[rgb(245_158_11/0.2)]")}
                    >
                      <Send size={18} strokeWidth={1.6} />
                    </button>
                    <button
                      type="button"
                      disabled={!active}
                      onClick={() => handlers.onRemove(entry)}
                      title={t("waitlist.action.remove")}
                      aria-label={`${t("waitlist.action.remove")} ${name}`}
                      className={clsx(ICON_BTN, "bg-[var(--octo-tone-danger-bg)] text-[#D20000] hover:bg-[rgb(239_68_68/0.2)] [[data-theme=dark]_&]:text-[var(--octo-tone-danger-text)]")}
                    >
                      <CircleX size={20} strokeWidth={2} />
                    </button>
                    <WaitlistRowMenu
                      open={openMenuId === entry.id}
                      onOpenChange={(open) => onOpenMenuChange(open ? entry.id : null)}
                      canEdit={active}
                      canMoveUp={active && (position ?? 1) > 1}
                      onEdit={() => handlers.onEdit(entry)}
                      onMoveUp={() => handlers.onMoveUp(entry)}
                      onViewHistory={() => handlers.onHistory(entry)}
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
