// The reservation row: the ten-cell card that repeats down the list on the
// Reservations page. Every cell reads straight off `Reservation` plus the
// small model helpers (`clock12`, `dayLabel`, `isPaid`) — no local
// formatting rules are invented here beyond what the fixtures already carry
// pre-formatted (ref, table, deposit amounts, cancelledAt).
import clsx from "clsx";
import { Link2, Mail, MessageCircle, Phone, SquarePen, Users, Utensils } from "lucide-react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation, ReservationStatus } from "@/shared/api/mock-reservations";
import { GuestAvatar } from "./guest-avatar";
import { clock12, dayLabel, formatDisplayDate, guestsText, isPaid, sourceLabel, tableLabel } from "./model";
import { RowActionsMenu } from "./row-actions-menu";
import { StatusMenu } from "./status-menu";
import { StatusPill } from "./status-pill";

export type RowMenu = "none" | "status" | "actions";

// Fixed grid tracks so Edit/Status/contact icons land at the same x-position
// on every row (fix round 1). Content-width flex cells drifted per-row once
// real, varying guest names and party sizes replaced the frame's single
// repeated mock guest.
//
// Guest was capped with minmax(160px,240px) in fix round 2, and Payment
// alone made up the row's only flexible track — but at a 1920px viewport
// that dumped ~400px of surplus into Payment alone, opening a single
// lopsided band between the deposit line and the Edit button that the
// frame (drawn at a narrower content width, everything already snug)
// never has to reckon with.
//
// Fix round 3: every "info" cell (Guest, Seating, Source, Payment) shares
// the surplus proportionally via minmax(floor, Nfr), so it grows together
// across four columns instead of piling onto one, and the row reads even
// at any width. Guest and Payment carry two lines of content (name+phone,
// pill+deposit) and get double the weight of Seating/Source's one line.
// Time, Party, Edit, Status, Contact and More stay fixed — they hold a
// short, bounded value or a control, not prose that benefits from room.
//
// Audit fix: the floor used to total 1280px, but at a 1440px viewport only
// ~1125px is left beside the sidebar, so Call, Email and the kebab were cut
// off and the actions menu opened half off-screen. Tracks are tightened so
// the floor totals 1104px and the whole row fits a standard laptop width.
const ROW_GRID_COLUMNS =
  "grid-cols-[104px_minmax(150px,2fr)_94px_minmax(116px,1fr)_minmax(110px,1fr)_minmax(150px,2fr)_80px_104px_156px_40px]";
// Sum of the fixed tracks plus every minmax()'s floor, so the row scrolls
// horizontally on narrow laptop widths instead of squeezing its columns out
// of alignment. The page wraps the row list in a horizontally-scrolling
// container sized to this.
export const ROW_LIST_MIN_WIDTH = "min-w-[1104px]";

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
      className={clsx("px-3 py-2.5", divider && "border-s border-[var(--octo-divider)]", className)}
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
  tone,
  icon,
  label,
}: {
  href?: string;
  disabled?: boolean;
  tone: string;
  icon: ReactNode;
  label: string;
}) {
  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        className="flex cursor-not-allowed flex-col items-center gap-1 text-[11px] text-[var(--octo-text-faint)] opacity-50"
      >
        {icon}
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex flex-col items-center gap-1 text-[11px] text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]"
    >
      <span style={{ color: tone }}>{icon}</span>
      {label}
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
      // No items-center here (fix round 3): grid items default to
      // align-self: stretch, so every Cell's box — and its border-s
      // divider — runs the full height of the row, matching the frame's
      // dividers running edge-to-edge. Each cell centers its own content
      // internally (see the per-cell "flex items-center" below).
      className={clsx(
        "grid cursor-pointer rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] transition-colors hover:border-[#0D6EFD]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
        ROW_GRID_COLUMNS
      )}
    >
      {/* 1. Time — dir="ltr" (fix round 4, finding 18): a bare "7:00 PM" in
          an RTL container reverses to "PM 7:00", the AM/PM token bidi-swapped
          in front of the digits. */}
      <Cell divider={false} className="!px-2.5">
        <p className="text-[15px] font-bold text-[#0D6EFD]" dir="ltr">{clock12(reservation.startMinutes)}</p>
        <p className="text-[11.5px] text-[var(--octo-text-muted)]">{dayText}</p>
        <p className="text-[11px] text-[var(--octo-text-faint)]">
          {t("reservations.list.row.ref").replace("{ref}", reservation.ref)}
        </p>
      </Cell>

      {/* 2. Guest — same dir="ltr" fix for the phone number (a "+" plus
          digits gets its own bidi reversal in RTL, e.g. "966510000137+"). */}
      <Cell className="flex items-center gap-2">
        <GuestAvatar name={reservation.guest} />
        <div>
          <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{reservation.guest}</p>
          <p className="text-[11.5px] text-[var(--octo-text-muted)]" dir="ltr">{reservation.phone}</p>
        </div>
      </Cell>

      {/* 3. Party */}
      <Cell className="flex items-center gap-1.5 !px-2.5">
        <Users size={14} className="shrink-0 text-[var(--octo-text-muted)]" />
        <span className="whitespace-nowrap text-[12px] text-[var(--octo-text-secondary)]">{guestsLabel}</span>
      </Cell>

      {/* 4. Seating */}
      <Cell className="flex items-center gap-1.5">
        <Utensils size={14} className="shrink-0 text-[var(--octo-text-muted)]" />
        <div>
          <p className="text-[12px] text-[var(--octo-text-primary)]">{reservation.area}</p>
          <p className="text-[11.5px] text-[var(--octo-text-muted)]">
            {reservation.table ? tableLabel(reservation.table) : t("reservations.form.tableAny")}
          </p>
        </div>
      </Cell>

      {/* 5. Source — translated (fix round 4, finding 6); this used to
          print the raw English source value even on the Arabic page. */}
      <Cell className="flex items-center gap-1.5">
        <Link2 size={14} className="shrink-0 text-[var(--octo-text-muted)]" />
        <span className="text-[12px] text-[var(--octo-text-primary)]">{sourceLabel(t, reservation.source)}</span>
      </Cell>

      {/* 6. Payment */}
      <Cell className="flex flex-col items-start gap-1">
        <StatusPill reservation={reservation} />
        {isCancelled
          ? reservation.cancelledAt && (
              <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                {t("reservations.list.row.cancelledOn").replace("{when}", reservation.cancelledAt)}
              </p>
            )
          : paid !== null &&
            reservation.deposit && (
              <>
                <p className="text-[11.5px] text-[var(--octo-text-secondary)]">
                  {depositPrefix}
                  {/* Bold blue only once it's actually paid (fix round 4,
                      finding 15) — every other row (unpaid, link-sent,
                      expired, failed) showed the amount the same bold blue
                      as a paid one, which the frame only ever does for PAID. */}
                  <span className={paid ? "font-bold text-[#0D6EFD]" : "font-normal text-[var(--octo-text-secondary)]"}>
                    {amountText}
                  </span>
                  {depositSuffix}
                </p>
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                    paid
                      ? "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]"
                      : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"
                  )}
                >
                  {paid ? t("reservations.list.row.paid") : t("reservations.list.row.unpaid")}
                </span>
              </>
            )}
      </Cell>

      {/* 7. Edit */}
      <Cell onClick={stopBubble} className="flex items-center !px-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-[7px] text-[12px] font-medium text-[#0D6EFD] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <SquarePen size={13} />
          {t("reservations.list.row.edit")}
        </button>
      </Cell>

      {/* 8. Status */}
      <Cell onClick={stopBubble} className="flex items-center !px-2">
        <StatusMenu
          value={reservation.status}
          onSelect={onStatus}
          open={menu === "status"}
          onOpenChange={(open) => onOpenMenu(open ? "status" : "none")}
        />
      </Cell>

      {/* 9. Contact */}
      <Cell onClick={stopBubble} className="flex items-center justify-center gap-2.5 !px-2">
        <ContactLink
          href={`https://wa.me/${digits}`}
          tone="#25D366"
          icon={<MessageCircle size={16} />}
          label={t("reservations.list.row.whatsapp")}
        />
        <ContactLink
          href={`tel:${reservation.phone}`}
          tone="#0D6EFD"
          icon={<Phone size={16} />}
          label={t("reservations.list.row.call")}
        />
        <ContactLink
          href={reservation.email ? `mailto:${reservation.email}` : undefined}
          disabled={!reservation.email}
          tone="var(--octo-text-muted)"
          icon={<Mail size={16} />}
          label={t("reservations.list.row.email")}
        />
      </Cell>

      {/* 10. More actions */}
      <Cell onClick={stopBubble} className="flex items-center justify-center !px-1">
        <RowActionsMenu
          onDuplicate={onDuplicate}
          onAddNote={onAddNote}
          onSendReminder={onSendReminder}
          onExportCalendar={onExportCalendar}
          onSharePaymentLink={onSharePaymentLink}
          onCancel={onCancel}
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
