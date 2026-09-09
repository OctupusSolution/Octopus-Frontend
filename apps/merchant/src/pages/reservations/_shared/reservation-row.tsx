// The reservation row: the ten-cell card that repeats down the list on the
// Reservations page. Every cell reads straight off `Reservation` plus the
// small model helpers (`clock12`, `dayLabel`, `isPaid`) — no local
// formatting rules are invented here beyond what the fixtures already carry
// pre-formatted (ref, table, deposit amounts, cancelledAt).
import clsx from "clsx";
import { Link2, Mail, MessageCircle, Phone, SquarePen, Users, Utensils } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation, ReservationStatus } from "@/shared/api/mock-reservations";
import { GuestAvatar } from "./guest-avatar";
import { clock12, dayLabel, isPaid, tableLabel } from "./model";
import { RowActionsMenu } from "./row-actions-menu";
import { StatusMenu } from "./status-menu";
import { StatusPill } from "./status-pill";

export type RowMenu = "none" | "status" | "actions";

// Fixed grid tracks so Edit/Status/contact icons land at the same x-position
// on every row (fix round 1). Content-width flex cells drifted per-row once
// real, varying guest names and party sizes replaced the frame's single
// repeated mock guest. Guest is the only flexible track — every other cell
// holds a short, roughly bounded value (a count, an id, an icon label).
const ROW_GRID_COLUMNS =
  "grid-cols-[124px_1fr_104px_148px_128px_180px_88px_128px_180px_40px]";
// Sum of the fixed tracks above, plus a floor for the flexible Guest column,
// so the row scrolls horizontally on narrow laptop widths instead of
// squeezing its columns out of alignment. The page wraps the row list in a
// horizontally-scrolling container sized to this.
export const ROW_LIST_MIN_WIDTH = "min-w-[1340px]";

export interface ReservationRowProps {
  reservation: Reservation;
  menu: RowMenu;
  onOpenMenu: (menu: RowMenu) => void;
  onOpen: () => void;
  onEdit: () => void;
  onStatus: (status: ReservationStatus) => void;
  onDuplicate: () => void;
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

function formatOtherDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    numberingSystem: "latn",
  }).format(new Date(`${date}T00:00:00`));
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
        : formatOtherDate(reservation.date, locale);

  const guestsText =
    reservation.partySize === 1
      ? t("reservations.list.row.guestOne")
      : t("reservations.list.row.guests").replace("{n}", String(reservation.partySize));

  const paid = isPaid(reservation);
  const isCancelled = reservation.status === "Cancelled";

  // "Deposit: {amount}" / "العربون: {amount}" — split on the placeholder so
  // the amount can render bold and blue without hardcoding word order.
  const depositTemplate = t("reservations.list.row.deposit");
  const [depositPrefix, depositSuffix] = depositTemplate.split("{amount}");
  const amountText = reservation.deposit ? `${reservation.deposit.currency} ${reservation.deposit.amount}` : "";

  const digits = reservation.phone.replace(/\D/g, "");

  return (
    <div
      onClick={onOpen}
      className={clsx(
        "grid cursor-pointer items-center rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] transition-colors hover:border-[#0D6EFD]/30",
        ROW_GRID_COLUMNS
      )}
    >
      {/* 1. Time */}
      <Cell divider={false}>
        <p className="text-[15px] font-bold text-[#0D6EFD]">{clock12(reservation.startMinutes)}</p>
        <p className="text-[11.5px] text-[var(--octo-text-muted)]">{dayText}</p>
        <p className="text-[11px] text-[var(--octo-text-faint)]">
          {t("reservations.list.row.ref").replace("{ref}", reservation.ref)}
        </p>
      </Cell>

      {/* 2. Guest */}
      <Cell className="flex items-center gap-2">
        <GuestAvatar name={reservation.guest} />
        <div>
          <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{reservation.guest}</p>
          <p className="text-[11.5px] text-[var(--octo-text-muted)]">{reservation.phone}</p>
        </div>
      </Cell>

      {/* 3. Party */}
      <Cell className="flex items-center gap-1.5">
        <Users size={14} className="shrink-0 text-[var(--octo-text-muted)]" />
        <span className="text-[12px] text-[var(--octo-text-secondary)]">{guestsText}</span>
      </Cell>

      {/* 4. Seating */}
      <Cell className="flex items-center gap-1.5">
        <Utensils size={14} className="shrink-0 text-[var(--octo-text-muted)]" />
        <div>
          <p className="text-[12px] text-[var(--octo-text-primary)]">{reservation.area}</p>
          <p className="text-[11.5px] text-[var(--octo-text-muted)]">{tableLabel(reservation.table)}</p>
        </div>
      </Cell>

      {/* 5. Source */}
      <Cell className="flex items-center gap-1.5">
        <Link2 size={14} className="shrink-0 text-[var(--octo-text-muted)]" />
        <span className="text-[12px] text-[var(--octo-text-primary)]">{reservation.source}</span>
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
                  <span className="font-bold text-[#0D6EFD]">{amountText}</span>
                  {depositSuffix}
                </p>
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                    paid ? "bg-[#16A34A]/10 text-[#15803D]" : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"
                  )}
                >
                  {paid ? t("reservations.list.row.paid") : t("reservations.list.row.unpaid")}
                </span>
              </>
            )}
      </Cell>

      {/* 7. Edit */}
      <Cell onClick={stopBubble} className="flex items-center">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[#0D6EFD] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <SquarePen size={13} />
          {t("reservations.list.row.edit")}
        </button>
      </Cell>

      {/* 8. Status */}
      <Cell onClick={stopBubble} className="flex items-center">
        <StatusMenu
          value={reservation.status}
          onSelect={onStatus}
          open={menu === "status"}
          onOpenChange={(open) => onOpenMenu(open ? "status" : "none")}
        />
      </Cell>

      {/* 9. Contact */}
      <Cell onClick={stopBubble} className="flex items-center gap-3">
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
      <Cell onClick={stopBubble} className="flex items-center">
        <RowActionsMenu
          onDuplicate={onDuplicate}
          onSharePaymentLink={onSharePaymentLink}
          onCancel={onCancel}
          canShareLink={Boolean(reservation.paymentLink)}
          open={menu === "actions"}
          onOpenChange={(open) => onOpenMenu(open ? "actions" : "none")}
        />
      </Cell>
    </div>
  );
}
