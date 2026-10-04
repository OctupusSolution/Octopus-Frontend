// The reservation row: the ten-cell card that repeats down the list on the
// Reservations page. Every cell reads straight off `Reservation` plus the
// small model helpers (`clock12`, `dayLabel`, `isPaid`) — no local
// formatting rules are invented here beyond what the fixtures already carry
// pre-formatted (ref, table, deposit amounts, cancelledAt).
import clsx from "clsx";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import type { Reservation, ReservationStatus } from "@/shared/api/mock-reservations";
import { GuestAvatar } from "./guest-avatar";
import { clock12, dayLabel, formatDisplayDate, guestsText, isPaid, sourceLabel, tableLabel } from "./model";
import { RowActionsMenu } from "./row-actions-menu";
import { StatusMenu } from "./status-menu";
import { StatusPill } from "./status-pill";
import { BORDER_300, SURFACE_WHITE, TEXT_BRAND_DEEP, TEXT_PRIMARY, TEXT_SEC_GRAY } from "./theme";

export type RowMenu = "none" | "status" | "actions";

// The frame's eight cells: Time, Guest, Party, Seating, Source, Payment,
// Edit+Status and Contact+More. Every cell but Guest, Seating and Source is
// exactly as wide as what it holds (a nowrap value or a fixed set of
// controls), so those keep the frame's pixel width at any viewport and
// Edit/Status/contact icons land at the same x-position on every row. The
// three prose cells share whatever is left in the frame's own 151:142:142
// ratio — at the frame's 1148px content width that resolves to the frame's
// exact widths, and it degrades to the floors below on a narrower laptop.
const ROW_GRID_COLUMNS =
  "grid-cols-[122px_minmax(128px,151fr)_92px_minmax(112px,142fr)_minmax(112px,142fr)_113px_184px_187px]";
// Sum of the fixed tracks plus every minmax()'s floor (plus the row's own
// padding and border), so the row scrolls horizontally on narrow laptop
// widths instead of squeezing its columns out of alignment. The page wraps
// the row list in a horizontally-scrolling container sized to this.
export const ROW_LIST_MIN_WIDTH = "min-w-[1068px]";

// The frame's WhatsApp glyph is two-colour, so it is drawn as an image rather
// than through ShellIcon's single-colour mask.
const WHATSAPP_ICON = new URL("../../../../../assets/Dashboard/icons/rsv-row-whatsapp.svg", import.meta.url).href;

export interface ReservationRowProps {
  reservation: Reservation;
  menu: RowMenu;
  onOpenMenu: (menu: RowMenu) => void;
  onOpen: () => void;
  onEdit: () => void;
  onStatus: (status: ReservationStatus) => void;
  onDuplicate: () => void;
  onAddNote: () => void;
  onSendReminder: () => void;
  onExportCalendar: () => void;
  onSharePaymentLink: () => void;
  onCancel: () => void;
  onToggleHidden: () => void;
}

// The buttons and menus nested in cells 7-10 need their clicks to never
// reach the row's own onClick — otherwise picking a status or opening the
// actions menu would also pop the detail dialog open behind it.
function stopBubble(event: MouseEvent) {
  event.stopPropagation();
}

function Cell({
  divider = true,
  className,
  onClick,
  children,
}: {
  divider?: boolean;
  className?: string;
  onClick?: (event: MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx("flex h-[60px] min-w-0 items-center px-2", divider && "border-e", divider && BORDER_300, className)}
    >
      {children}
    </div>
  );
}

// Contact icon+label mini-buttons (WhatsApp / Call / Email) share the same
// shape — a small vertical stack, icon over label.
function ContactLink({
  href,
  disabled,
  icon,
  label,
}: {
  href?: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
}) {
  const body = (
    <>
      <span className="grid h-8 w-8 place-items-center rounded-[8px]">{icon}</span>
      <span className="text-[10px] leading-[10px]">{label}</span>
    </>
  );
  const shape = clsx("flex h-[50px] w-[49px] flex-col items-center gap-1 text-center", TEXT_PRIMARY);
  if (disabled || !href) {
    return (
      <span aria-disabled="true" className={clsx(shape, "cursor-not-allowed opacity-40")}>
        {body}
      </span>
    );
  }
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className={clsx(shape, "transition-opacity hover:opacity-70")}
    >
      {body}
    </a>
  );
}

export function ReservationRow({
  reservation,
  menu,
  onOpenMenu,
  onOpen,
  onEdit,
  onStatus,
  onDuplicate,
  onAddNote,
  onSendReminder,
  onExportCalendar,
  onSharePaymentLink,
  onCancel,
  onToggleHidden,
}: ReservationRowProps) {
  const { t, locale } = useI18n();

  const day = dayLabel(reservation.date);
  const dayText =
    day === "today"
      ? t("reservations.list.filter.today")
      : day === "tomorrow"
        ? t("reservations.list.filter.tomorrow")
        : formatDisplayDate(reservation.date, locale);

  const guestsLabel = guestsText(t, reservation.partySize);

  const paid = isPaid(reservation);
  const isCancelled = reservation.status === "Cancelled";

  // "Deposit: {amount}" / "العربون: {amount}" — split on the placeholder so
  // the amount can render bold and blue without hardcoding word order.
  const depositTemplate = t("reservations.list.row.deposit");
  const [depositPrefix, depositSuffix] = depositTemplate.split("{amount}");
  const amountText = reservation.deposit ? `${reservation.deposit.currency} ${reservation.deposit.amount}` : "";

  const digits = reservation.phone.replace(/\D/g, "");

  // Enter/Space opens the detail dialog the same as a click (fix round 4,
  // finding 24) — the design gives no other entry point, so without this a
  // keyboard/screen-reader user simply cannot open a reservation. Guarded
  // to the row's own keydown (not one bubbling up from a focused nested
  // button/menu — Edit, Status, contact links, More — each of which
  // already handles its own Enter/Space as a native <button>/<a>).
  function onRowKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={onRowKeyDown}
      // The row's own text content would otherwise be the accessible name —
      // every cell's text concatenated — so name it explicitly instead,
      // reusing the detail dialog's own title key rather than adding a new
      // one just for this label.
      aria-label={t("reservations.detail.title").replace("{ref}", reservation.ref)}
      // The row carries the frame's own padding and every Cell is a fixed
      // 60px tall, so the border-e dividers stop short of the card's edges
      // exactly as the frame draws them. Each cell centers its own content.
      className={clsx(
        "grid cursor-pointer rounded-[12px] border px-2 py-4 shadow-[0_0_6px_0_rgba(0,0,0,0.12)] transition-colors hover:border-[#0d6efd]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
        BORDER_300,
        SURFACE_WHITE,
        ROW_GRID_COLUMNS
      )}
    >
      {/* 1. Time — dir="ltr" (fix round 4, finding 18): a bare "7:00 PM" in
          an RTL container reverses to "PM 7:00", the AM/PM token bidi-swapped
          in front of the digits. */}
      <Cell className="flex-col justify-between text-center">
        <p className={clsx("w-full text-[18px] font-bold leading-[18px]", TEXT_BRAND_DEEP)} dir="ltr">
          {clock12(reservation.startMinutes)}
        </p>
        <div className={clsx("flex w-full flex-col items-center gap-1 text-[14px] font-medium leading-[14px]", TEXT_SEC_GRAY)}>
          <p className="w-full truncate">{dayText}</p>
          <p className="whitespace-nowrap">{t("reservations.list.row.ref").replace("{ref}", reservation.ref)}</p>
        </div>
      </Cell>

      {/* 2. Guest — same dir="ltr" fix for the phone number (a "+" plus
          digits gets its own bidi reversal in RTL, e.g. "966510000137+"). */}
      <Cell className="gap-[5px]">
        <GuestAvatar name={reservation.guest} size={32} />
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] leading-[12px]">
          <p className={clsx("truncate font-semibold", TEXT_PRIMARY)}>{reservation.guest}</p>
          <p className={clsx("truncate text-start", TEXT_SEC_GRAY)} dir="ltr">{reservation.phone}</p>
        </div>
      </Cell>

      {/* 3. Party */}
      <Cell className={clsx("justify-between", TEXT_PRIMARY)}>
        <ShellIcon name="rsv-row-user.svg" size={24} />
        <span className="whitespace-nowrap text-[12px] font-medium leading-[12px]">{guestsLabel}</span>
      </Cell>

      {/* 4. Seating */}
      <Cell className="gap-1">
        <span className={clsx("grid h-6 w-6 shrink-0 place-items-center", TEXT_PRIMARY)}>
          <ShellIcon name="rsv-row-table.svg" size={21} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] leading-[12px]">
          <p className={clsx("truncate font-medium", TEXT_PRIMARY)}>{reservation.area}</p>
          <p className={clsx("truncate", TEXT_SEC_GRAY)}>
            {reservation.table ? tableLabel(reservation.table) : t("reservations.form.tableAny")}
          </p>
        </div>
      </Cell>

      {/* 5. Source — translated (fix round 4, finding 6); this used to
          print the raw English source value even on the Arabic page. */}
      <Cell className={clsx("gap-1", TEXT_PRIMARY)}>
        <ShellIcon name="rsv-row-link.svg" size={24} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-[12px]">
          {sourceLabel(t, reservation.source)}
        </span>
      </Cell>

      {/* 6. Payment */}
      <Cell>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <StatusPill reservation={reservation} />
          {isCancelled
            ? reservation.cancelledAt && (
                <p className={clsx("text-[12px] leading-[1.2]", TEXT_SEC_GRAY)}>
                  {t("reservations.list.row.cancelledOn").replace("{when}", reservation.cancelledAt)}
                </p>
              )
            : paid !== null &&
              reservation.deposit && (
                <>
                  <p className={clsx("whitespace-nowrap text-[12px] leading-[12px]", TEXT_SEC_GRAY)}>
                    {depositPrefix}
                    {/* Bold blue only once it's actually paid (fix round 4,
                        finding 15) — every other row (unpaid, link-sent,
                        expired, failed) showed the amount the same bold blue
                        as a paid one, which the frame only ever does for PAID. */}
                    <span className={paid ? clsx("font-semibold", TEXT_BRAND_DEEP) : undefined}>{amountText}</span>
                    {depositSuffix}
                  </p>
                  <span
                    className={clsx(
                      "whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-[12px]",
                      paid
                        ? "bg-[#dcffef] text-[#009a39] [[data-theme=dark]_&]:bg-[rgb(0_154_57_/_0.16)] [[data-theme=dark]_&]:text-[#4ade80]"
                        : // The frame tints UNPAID amber on a Pending row and grey on every other one.
                          reservation.status === "Pending"
                          ? "bg-[#fff5e4] text-[#ffb020] [[data-theme=dark]_&]:bg-[rgb(255_176_32_/_0.16)] [[data-theme=dark]_&]:text-[#fbbf24]"
                          : "bg-[#e2e8f0] text-[#58606c] [[data-theme=dark]_&]:bg-[var(--octo-track)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]"
                    )}
                  >
                    {paid ? t("reservations.list.row.paid") : t("reservations.list.row.unpaid")}
                  </span>
                </>
              )}
        </div>
      </Cell>

      {/* 7. Edit + Status */}
      <Cell onClick={stopBubble} className="justify-between gap-1">
        <button
          type="button"
          onClick={onEdit}
          className={clsx(
            "inline-flex h-8 items-center justify-center gap-1 rounded-[8px] border p-2 text-[14px] font-medium leading-[14px] transition-colors hover:bg-[var(--octo-hover)]",
            BORDER_300,
            SURFACE_WHITE,
            TEXT_BRAND_DEEP
          )}
        >
          <ShellIcon name="rsv-row-edit.svg" size={24} />
          {t("reservations.list.row.edit")}
        </button>
        <StatusMenu
          value={reservation.status}
          onSelect={onStatus}
          open={menu === "status"}
          onOpenChange={(open) => onOpenMenu(open ? "status" : "none")}
        />
      </Cell>

      {/* 8. Contact + more actions */}
      <Cell divider={false} onClick={stopBubble} className="justify-end gap-1 !pe-0 !ps-1">
        <ContactLink
          href={`https://wa.me/${digits}`}
          icon={<img src={WHATSAPP_ICON} alt="" width={24} height={24} />}
          label={t("reservations.list.row.whatsapp")}
        />
        <ContactLink
          href={`tel:${reservation.phone}`}
          icon={<ShellIcon name="rsv-row-call.svg" size={24} className="text-[#004bb9] [[data-theme=dark]_&]:text-[var(--octo-accent)]" />}
          label={t("reservations.list.row.call")}
        />
        <ContactLink
          href={reservation.email ? `mailto:${reservation.email}` : undefined}
          disabled={!reservation.email}
          icon={<ShellIcon name="rsv-row-sms.svg" size={24} />}
          label={t("reservations.list.row.email")}
        />
        <RowActionsMenu
          onDuplicate={onDuplicate}
          onAddNote={onAddNote}
          onSendReminder={onSendReminder}
          onExportCalendar={onExportCalendar}
          onSharePaymentLink={onSharePaymentLink}
          onCancel={onCancel}
          onToggleHidden={onToggleHidden}
          hidden={Boolean(reservation.hidden)}
          // Enabled whenever there's a deposit to share a link for (fix
          // round 4, finding 8) — not `Boolean(reservation.paymentLink)`,
          // which only let a *second* link ever be shared and greyed out
          // exactly the pending, never-yet-sent rows that most need it.
          canShareLink={Boolean(reservation.deposit)}
          open={menu === "actions"}
          onOpenChange={(open) => onOpenMenu(open ? "actions" : "none")}
        />
      </Cell>
    </div>
  );
}
