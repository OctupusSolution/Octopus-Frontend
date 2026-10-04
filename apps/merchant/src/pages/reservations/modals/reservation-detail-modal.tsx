// Task 10: the reservation detail dialog. One component covers all eight
// design frames — the state shown (banner, panel and footer) is *derived*
// from the reservation, not passed in, via `detailState` in `_shared/model.ts`.
// Task 11 lifted the guest card and meta row out into
// `_shared/guest-card.tsx` / `_shared/meta-row.tsx` once the cancel dialog
// needed the same two pieces.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { getReservationContactLink } from "@octopus/api-client";
import { Input, Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation } from "@/shared/api/mock-reservations";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { GuestCard } from "../_shared/guest-card";
import { MetaRow } from "../_shared/meta-row";
import { channelLabel, DEPOSIT_STATE_LABEL_KEY, detailState, STATE_LABEL_KEY, type DetailState } from "../_shared/model";
import { useDismiss } from "../_shared/use-dismiss";
import { downloadFile } from "../_shared/download";
import { buildReceiptHtml, paymentIssueMessage, whatsappHref } from "../_shared/guest-actions";
import { useReservationsExtraText } from "../_shared/extra-text";
import {
  BORDER_200,
  BORDER_300,
  SURFACE_100,
  SURFACE_BRAND_LIGHT,
  SURFACE_RED_LIGHT,
  SURFACE_WHITE,
  TEXT_BRAND,
  TEXT_BRAND_DEEP,
  TEXT_ERROR,
  TEXT_PRIMARY,
  TEXT_SEC_GRAY,
  TEXT_SECONDARY,
  TEXT_SUCCESS,
} from "../_shared/theme";

export interface ReservationDetailModalProps {
  open: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onResendLink: () => void;
  onShareLink: () => void;
  /** The guest paid the deposit in person. */
  onRecordCash: () => void;
  /** Waives the deposit this reservation would otherwise owe, for `reason`. */
  onWaiveDeposit: (reason: string) => void;
  /** Requests the refund a cancelled, paid reservation already has due. */
  onIssueRefund: () => void;
  /** Asks the payment provider directly whether a sent link has been paid,
   *  instead of waiting on its own poll. */
  onRecheckDeposit: () => void;
  /** The server's own status is "Expired" (the view model shows it as
   *  Pending) — offers Reinstate. */
  expired?: boolean;
  /** POST /{id}/reinstate — brings an expired reservation back. */
  onReinstate?: () => void;
}

// The dialog shell both reservation dialogs share (the cancel dialog imports
// these): a 738px white card, 32px radius, 24px padding, on a 60% scrim. The
// shared Modal draws its own small title bar, so that <h2> is hidden and
// DialogTitle below draws the frame's 24px one inside the body instead —
// `title` is still passed, as a string, so the dialog keeps its aria-label.
export const DIALOG_CLASS = `!max-w-[738px] !rounded-[32px] !p-6 !shadow-none [&>h2]:hidden [&>h2+div]:!mt-0 ${SURFACE_WHITE}`;
export const DIALOG_BACKDROP_CLASS = "bg-black/60";

export function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [overflow-wrap:anywhere] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
      {children}
    </h2>
  );
}

// The frames' 48px footer buttons: 12px radius, 18px bold label.
export const FOOTER_BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[12px] px-3 py-2 text-center text-[18px] font-bold leading-[18px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6efd]/40 disabled:cursor-not-allowed disabled:opacity-50";
export const FOOTER_PRIMARY = `${FOOTER_BUTTON} flex-auto bg-[#0d6efd] text-white`;
const FOOTER_TINTED_BLUE = `${FOOTER_BUTTON} shrink-0 ${SURFACE_BRAND_LIGHT} ${TEXT_BRAND}`;
const FOOTER_TINTED_RED = `${FOOTER_BUTTON} shrink-0 ${SURFACE_RED_LIGHT} ${TEXT_ERROR}`;

// Banner tints sampled from the frames. The amber, violet and green pairs
// aren't in _shared/theme.ts, so they're literal here with a dark override
// in that file's style — dark mode's contrast fix (fix round 4, finding 27)
// still lives in one place per tone, light stays byte-identical to the frames.
const TONE_AMBER =
  "bg-[#fff5e4] text-[#d96703] [[data-theme=dark]_&]:bg-[rgb(245_158_11_/_0.16)] [[data-theme=dark]_&]:text-[#fbbf24]";
const TONE_VIOLET =
  "bg-[#f7f4ff] text-[#6c4dff] [[data-theme=dark]_&]:bg-[rgb(108_77_255_/_0.18)] [[data-theme=dark]_&]:text-[#a99bff]";
const TONE_GREEN = `bg-[#dcffef] [[data-theme=dark]_&]:bg-[rgb(34_197_94_/_0.16)] ${TEXT_SUCCESS}`;
const TONE_RED = `${SURFACE_RED_LIGHT} ${TEXT_ERROR}`;
const TONE_GREY = `${SURFACE_100} ${TEXT_SEC_GRAY}`;

const BANNER_CLASS: Record<DetailState, string> = {
  confirmed: TONE_GREEN,
  pending: TONE_AMBER,
  "link-sent": TONE_VIOLET,
  paid: TONE_GREEN,
  failed: TONE_RED,
  expired: TONE_GREY,
  "payment-cancelled": TONE_RED,
  // Fix round 1, finding 2. A cancelled reservation (status === "Cancelled")
  // always wins over whatever its deposit is doing; see detailState() in
  // _shared/model.ts. Same red treatment as "failed", as its frame draws it.
  cancelled: TONE_RED,
  // Fix round 4, finding 5 — not one of the frames. "progressed"
  // (Arrived/Seated/Completed) reuses the same green as "confirmed"; the
  // booking is further along than confirmed, not in any kind of trouble.
  // "no-show" gets the same neutral grey as the expired banner.
  progressed: TONE_GREEN,
  "no-show": TONE_GREY,
};

const ICON_ERROR_CIRCLE = "rsv-modal-error-circle.svg";
const ICON_CHECK_DONE = "rsv-modal-check-done.svg";

const BANNER_ICON: Record<DetailState, string> = {
  confirmed: ICON_CHECK_DONE,
  pending: ICON_ERROR_CIRCLE,
  "link-sent": ICON_ERROR_CIRCLE,
  paid: ICON_CHECK_DONE,
  failed: ICON_ERROR_CIRCLE,
  expired: ICON_ERROR_CIRCLE,
  "payment-cancelled": ICON_ERROR_CIRCLE,
  cancelled: ICON_ERROR_CIRCLE,
  progressed: ICON_CHECK_DONE,
  "no-show": ICON_ERROR_CIRCLE,
};

// The eight frames' own banner copy — distinct from the row pill's plainer
// state labels (e.g. "Payment Link Sent" here vs. "Link Sent" on the pill).
// "progressed" and "no-show" (fix round 4, finding 5) aren't in this map —
// build only from existing i18n keys and the design language already
// established (there are no frames for these two), so their banner text is
// resolved from the reservation's own status via STATE_LABEL_KEY instead;
// see the `banner` JSX below.
// `confirmedMethod` is a stable code ("auto"/"staff") from the real API, but
// stays free display text for the mock-fixture rows this module started
// from ("AUTO (Deposit Paid)") — an unrecognized value is shown as-is rather
// than dropped, so those fixtures still render.
const CONFIRMED_METHOD_LABEL_KEY: Record<string, string> = {
  auto: "reservations.detail.confirmedAuto",
  staff: "reservations.detail.confirmedStaff",
};

function confirmedMethodLabel(t: (key: string) => string, method: string | undefined): string {
  if (!method) return "—";
  const key = CONFIRMED_METHOD_LABEL_KEY[method];
  return key ? t(key) : method;
}

const BANNER_LABEL_KEY: Partial<Record<DetailState, string>> = {
  confirmed: "reservations.detail.state.confirmed",
  pending: "reservations.detail.state.pending",
  "link-sent": "reservations.detail.state.linkSent",
  paid: "reservations.detail.state.paid",
  failed: "reservations.detail.state.failed",
  expired: "reservations.detail.state.expired",
  "payment-cancelled": "reservations.detail.state.paymentCancelled",
  // No "reservations.detail.state.cancelled" key exists (this state isn't
  // in the brief's key list either) — reuse the row pill's own label.
  cancelled: "reservations.state.cancelled",
};

// The 40px tinted strip: the state banner, and the pending state's
// auto-confirm note under the deposit card.
function Banner({ icon, tone, children }: { icon: string; tone: string; children: ReactNode }) {
  return (
    <div className={clsx("flex min-h-10 items-center gap-1 rounded-[12px] px-3 py-2 text-[14px] font-medium leading-[1.3]", tone)}>
      <ShellIcon name={icon} size={24} />
      {children}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`inline-flex shrink-0 items-center gap-1 text-[12px] font-medium leading-3 ${TEXT_SECONDARY}`}>
        {icon}
        {label}
      </span>
      <span
        className={clsx(
          "min-w-0 text-end text-[14px] font-medium leading-[14px] [overflow-wrap:anywhere]",
          valueClassName ?? TEXT_PRIMARY
        )}
      >
        {value}
      </span>
    </div>
  );
}

function DetailRows({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

function Panel({ children }: { children: ReactNode }) {
  return <div className={`flex flex-col gap-2 rounded-[8px] border px-2 py-3 ${BORDER_300}`}>{children}</div>;
}

function PanelHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 border-b pb-3 text-[16px] font-medium leading-4",
        BORDER_200,
        className
      )}
    >
      {children}
    </div>
  );
}

// A panel's own action row (record cash / waive deposit) when it follows the
// panel's rows — the frames don't draw one, so it sits under a divider in
// the panel's own language.
function PanelActions({ children }: { children: ReactNode }) {
  return <div className={`mt-2 border-t pt-3 ${BORDER_200}`}>{children}</div>;
}

const PANEL_BUTTON =
  "inline-flex h-10 items-center justify-center gap-1 rounded-[12px] px-3 text-[14px] font-medium leading-[14px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6efd]/40 disabled:cursor-not-allowed disabled:opacity-50";
const PANEL_BUTTON_TINTED = `${PANEL_BUTTON} ${SURFACE_BRAND_LIGHT} ${TEXT_BRAND}`;
const PANEL_BUTTON_PRIMARY = `${PANEL_BUTTON} bg-[#0d6efd] text-white`;

// The plain single-line boxes for failed / expired / payment-cancelled — no
// heading, just a bordered box holding one line of red (or grey) text.
function MessageBox({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <div className={clsx("rounded-[8px] border px-2 py-3 text-[16px] font-medium leading-4", BORDER_300, tone)}>
      {children}
    </div>
  );
}

// The second, grey line a cancelled / no-show box carries when a reason was
// recorded.
function MessageNote({ children }: { children: ReactNode }) {
  return <span className={`mt-2 block text-[12px] font-medium leading-4 ${TEXT_SECONDARY}`}>{children}</span>;
}

// The floating menu card the Send Message frame draws; the "⋮" menu reuses it.
const MENU_PANEL = `absolute z-20 flex w-max min-w-[146px] flex-col gap-2 rounded-[16px] p-3 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)] ${SURFACE_WHITE}`;
const MENU_ITEM = "flex w-full items-center gap-1 rounded-[4px] px-1 py-2 text-start text-[12px] font-semibold leading-3";
const MENU_ICON_SLOT = "grid size-6 shrink-0 place-items-center";

// The "Send Message" button + popover from the eighth frame — WhatsApp /
// Call / Email, each a link to the same targets reservation-row.tsx's
// contact icons use. Self-contained (owns its own open state) so the
// `useDismiss` ref can wrap *both* the toggle button and the popover panel
// in one subtree — matching MoreMenuButton's shape below. Splitting the
// trigger and the panel across two refs (fix round 1, finding 1) meant the
// button sat outside the dismiss subtree: its own mousedown fired the
// dismiss handler first (closing the popover), then its onClick re-opened
// it, so the button could never close what it opened.
function SendMessageButton({ reservation, t }: { reservation: Reservation; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const digits = reservation.phone.replace(/\D/g, "");

  const items = [
    // The frame's WhatsApp glyph is 17 x 20 inside the 24px slot.
    { key: "whatsapp", href: `https://wa.me/${digits}`, icon: <ShellIcon name="rsv-modal-menu-whatsapp.svg" size={20} />, label: t("reservations.list.row.whatsapp") },
    { key: "call", href: `tel:${reservation.phone}`, icon: <ShellIcon name="rsv-row-call.svg" size={24} />, label: t("reservations.list.row.call") },
    {
      key: "email",
      href: reservation.email ? `mailto:${reservation.email}` : undefined,
      icon: <ShellIcon name="rsv-modal-sms.svg" size={24} />,
      label: t("reservations.list.row.email"),
    },
  ];

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" className={FOOTER_TINTED_BLUE} onClick={() => setOpen((v) => !v)}>
        {t("reservations.detail.sendMessage")}
      </button>
      {open && (
        <div role="menu" className={clsx(MENU_PANEL, "top-full start-0 mt-2")}>
          {items.map((item) =>
            item.href ? (
              <a
                key={item.key}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={clsx(MENU_ITEM, SURFACE_BRAND_LIGHT, TEXT_PRIMARY, "transition-opacity hover:opacity-80")}
              >
                <span className={MENU_ICON_SLOT}>{item.icon}</span>
                {item.label}
              </a>
            ) : (
              // Disabled because this guest has no email on file — not
              // because the action lacks a backend, so (fix round 1,
              // finding 4) this gets no title, matching
              // reservation-row.tsx's ContactLink for the same case.
              <span
                key={item.key}
                role="menuitem"
                aria-disabled="true"
                className={clsx(MENU_ITEM, SURFACE_BRAND_LIGHT, TEXT_PRIMARY, "cursor-not-allowed opacity-40")}
              >
                <span className={MENU_ICON_SLOT}>{item.icon}</span>
                {item.label}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}

// The small "⋮" menu the confirmed / pending / link-sent / paid footers
// share — its one item is "Cancel Reservation".
function MoreMenuButton({ onCancel, t }: { onCancel: () => void; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("reservations.list.row.more")}
        onClick={() => setOpen((v) => !v)}
        className={`grid size-12 shrink-0 place-items-center rounded-[8px] bg-[#f2f2f2] p-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6efd]/40 [[data-theme=dark]_&]:bg-[var(--octo-track)] ${TEXT_PRIMARY}`}
      >
        <ShellIcon name="rsv-modal-more.svg" size={24} />
      </button>
      {open && (
        <div role="menu" className={clsx(MENU_PANEL, "bottom-full start-0 mb-2")}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCancel();
              setOpen(false);
            }}
            className={clsx(MENU_ITEM, "!px-2 !py-3", SURFACE_RED_LIGHT, TEXT_ERROR, "transition-opacity hover:opacity-80")}
          >
            {t("reservations.detail.cancelReservation")}
          </button>
        </div>
      )}
    </div>
  );
}

// The "pending"/"link-sent"/"failed"/"expired" panels' own action row: the
// guest paid in cash instead of the link, or the deposit is waived outright.
// Waiving needs a reason, so it opens an inline field rather than firing on
// one click — the same self-contained-popover shape as SendMessageButton
// above, just a text field instead of a menu.
function DepositActions({
  onRecordCash,
  onWaiveDeposit,
  t,
}: {
  onRecordCash: () => void;
  onWaiveDeposit: (reason: string) => void;
  t: (key: string) => string;
}) {
  const [waiving, setWaiving] = useState(false);
  const [reason, setReason] = useState("");
  const ref = useDismiss(waiving, () => setWaiving(false));

  function confirmWaive() {
    if (!reason.trim()) return;
    onWaiveDeposit(reason.trim());
    setWaiving(false);
    setReason("");
  }

  if (waiving) {
    return (
      <div ref={ref} className="flex flex-wrap items-center gap-2">
        <Input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("reservations.detail.waiveReasonPlaceholder")}
          className={`!h-10 !w-56 !max-w-full !rounded-[12px] !px-2 !text-[14px] ${BORDER_300}`}
          onKeyDown={(e) => e.key === "Enter" && confirmWaive()}
        />
        <button type="button" className={PANEL_BUTTON_PRIMARY} disabled={!reason.trim()} onClick={confirmWaive}>
          {t("reservations.detail.waiveConfirm")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={PANEL_BUTTON_TINTED} onClick={onRecordCash}>
        {t("reservations.detail.recordCash")}
      </button>
      <button type="button" className={PANEL_BUTTON_TINTED} onClick={() => setWaiving(true)}>
        {t("reservations.detail.waiveDeposit")}
      </button>
    </div>
  );
}

export function ReservationDetailModal({
  open,
  reservation,
  onClose,
  onEdit,
  onCancel,
  onResendLink,
  onShareLink,
  onRecordCash,
  onWaiveDeposit,
  onIssueRefund,
  onRecheckDeposit,
  expired = false,
  onReinstate,
}: ReservationDetailModalProps) {
  const extra = useReservationsExtraText();
  const { t, locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset transient UI state whenever a fresh reservation is opened, so a
  // second "view" after a first doesn't inherit a stuck copy label. (The
  // Send Message button owns its own open state now — see
  // SendMessageButton above — so it resets on its own remount.)
  useEffect(() => {
    if (open) {
      setCopied(false);
    }
  }, [open, reservation?.id]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  if (!reservation) return null;

  const state = detailState(reservation);

  // Both used to be disabled as "needs a backend", but neither does: the
  // receipt is generated from data already on the reservation, and the
  // guest is reached over WhatsApp with the message already typed.
  function downloadReceipt() {
    if (!reservation) return;
    downloadFile("receipt-" + reservation.ref + ".html", buildReceiptHtml(t, reservation, locale), "text/html;charset=utf-8");
  }

  // Opens the tab synchronously so the browser doesn't treat it as an
  // unrequested popup; getReservationContactLink's server-templated message
  // fills it in once it answers, falling back to the local wa.me text if it
  // doesn't (see reservations/index.tsx's sendReminder for the same shape).
  function notifyGuest() {
    if (!reservation) return;
    const win = window.open("", "_blank", "noopener,noreferrer");
    const fallback = () => {
      if (win) win.location.href = whatsappHref(reservation.phone, paymentIssueMessage(t, reservation));
    };
    if (!activeBusinessId) return fallback();
    getReservationContactLink(activeBusinessId, reservation.id, locale)
      .then((link) => {
        if (win) win.location.href = link.url;
      })
      .catch(fallback);
  }

  async function copyLink() {
    if (!reservation?.paymentLink) return;
    try {
      await navigator.clipboard.writeText(reservation.paymentLink.url);
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can throw (permissions, insecure context, …) —
      // swallow it rather than let it blank the dialog. The button simply
      // doesn't flip to "Copied".
    }
  }

  // "progressed"/"no-show" have no frame-specific banner copy (fix round
  // 4, finding 5) — their label is the reservation's own status label
  // (Arrived/Seated/Completed/No-show), reusing STATE_LABEL_KEY rather
  // than inventing new detail-only copy.
  const bannerLabelKey = BANNER_LABEL_KEY[state] ?? STATE_LABEL_KEY[reservation.status];

  const banner = (
    <Banner icon={BANNER_ICON[state]} tone={BANNER_CLASS[state]}>
      {t(bannerLabelKey)}
    </Banner>
  );

  const guestCard = <GuestCard reservation={reservation} />;
  const metaRow = <MetaRow reservation={reservation} />;

  let panel: ReactNode;
  switch (state) {
    case "confirmed":
    // Fix round 4, finding 5 — "progressed" (Arrived/Seated/Completed)
    // reuses this exact panel shape: no frame covers those three statuses,
    // and the booking already went through everything this panel shows
    // (it was confirmed, then progressed further).
    case "progressed":
      panel = (
        <Panel>
          <PanelHeading>
            <span className={`inline-flex items-center gap-2 ${TEXT_SUCCESS}`}>
              <ShellIcon name={ICON_CHECK_DONE} size={24} />
              {t("reservations.detail.confirmedPanel")}
            </span>
          </PanelHeading>
          <DetailRows>
            <DetailRow label={t("reservations.detail.confirmedOn")} value={reservation.confirmedOn ?? "—"} />
            <DetailRow label={t("reservations.detail.confirmedMethod")} value={confirmedMethodLabel(t, reservation.confirmedMethod)} />
          </DetailRows>
        </Panel>
      );
      break;

    case "pending": {
      const deposit = reservation.deposit;
      // The real deposit state, not a hardcoded "UNPAID" (fix round 4,
      // finding 5) — every reservation.deposit?.state that can still reach
      // "pending" (none, unpaid, absent, or an odd leftover like
      // "refunded") maps through the same table the edit form's Deposit
      // Status select uses, defaulting to "unpaid" when there's no deposit
      // at all.
      const depositStateKey = DEPOSIT_STATE_LABEL_KEY[deposit && deposit.state !== "none" ? deposit.state : "unpaid"];
      panel = (
        <>
          <Panel>
            <PanelHeading>
              <span className={TEXT_PRIMARY}>{t("reservations.detail.depositInfo")}</span>
              <span className={`text-[14px] leading-[14px] ${TEXT_PRIMARY}`}>
                {deposit?.currency ?? "SAR"} {deposit?.amount ?? 0}{" "}
                <span className={`text-[12px] font-normal leading-3 ${TEXT_SECONDARY}`}>{t("reservations.detail.required")}</span>
              </span>
            </PanelHeading>
            <DetailRows>
              <DetailRow
                icon={<ShellIcon name="rsv-modal-status.svg" size={16} />}
                label={t("reservations.detail.status")}
                value={t(depositStateKey)}
                valueClassName="text-[#f59e00]"
              />
              <DetailRow
                icon={<ShellIcon name="rsv-modal-money.svg" size={16} />}
                label={t("reservations.detail.depositAmount")}
                value={`${deposit?.currency ?? "SAR"} ${deposit?.amount ?? 0}`}
              />
              <DetailRow
                icon={<ShellIcon name="rsv-modal-time.svg" size={16} />}
                label={t("reservations.detail.dueBy")}
                value={deposit?.dueBy ?? "—"}
              />
            </DetailRows>
            <PanelActions>
              <DepositActions onRecordCash={onRecordCash} onWaiveDeposit={onWaiveDeposit} t={t} />
            </PanelActions>
          </Panel>
          <Banner icon={ICON_ERROR_CIRCLE} tone={TONE_AMBER}>
            {t("reservations.detail.autoConfirmNote")}
          </Banner>
        </>
      );
      break;
    }

    case "link-sent": {
      const link = reservation.paymentLink;
      panel = (
        <Panel>
          <PanelHeading>
            <span className={TEXT_PRIMARY}>{t("reservations.detail.linkPanel")}</span>
          </PanelHeading>
          <div className={`flex items-center justify-between gap-2 overflow-hidden rounded-[12px] border border-[#abcdff] px-3 py-2 [[data-theme=dark]_&]:border-[var(--octo-accent)] ${SURFACE_100}`}>
            <a
              href={link?.url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={`truncate text-[14px] font-semibold leading-4 hover:underline ${TEXT_BRAND_DEEP}`}
            >
              {link?.url}
            </a>
            <button
              type="button"
              onClick={copyLink}
              className={`inline-flex shrink-0 items-center text-[12px] font-medium leading-4 transition-opacity hover:opacity-75 ${TEXT_BRAND}`}
              aria-label={t("reservations.detail.copyLink")}
            >
              {copied ? t("reservations.detail.copied") : <ShellIcon name="rsv-modal-copy.svg" size={16} />}
            </button>
          </div>
          <DetailRows>
            {/* sentVia translated (fix round 4, finding 6) — this used to
                print the raw "WhatsApp"/"SMS"/"Email" value even on the
                Arabic page. */}
            <DetailRow
              label={t("reservations.detail.sentVia")}
              value={link ? channelLabel(t, link.sentVia) : "—"}
            />
            <DetailRow label={t("reservations.detail.sentTo")} value={link?.sentTo ?? "—"} />
            <DetailRow label={t("reservations.detail.sentOn")} value={link?.sentOn ?? "—"} />
            <DetailRow label={t("reservations.detail.expireOn")} value={link?.expiresOn ?? "—"} />
          </DetailRows>
          <PanelActions>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onRecheckDeposit} className={PANEL_BUTTON_TINTED}>
                <ShellIcon name="refresh.svg" size={16} />
                {t("reservations.detail.recheckStatus")}
              </button>
              <DepositActions onRecordCash={onRecordCash} onWaiveDeposit={onWaiveDeposit} t={t} />
            </div>
          </PanelActions>
        </Panel>
      );
      break;
    }

    case "paid": {
      const deposit = reservation.deposit;
      panel = (
        <Panel>
          <PanelHeading>
            <span className={`inline-flex items-center gap-2 ${TEXT_SUCCESS}`}>
              <ShellIcon name={ICON_CHECK_DONE} size={24} />
              {t("reservations.detail.paymentSuccessful")}
            </span>
          </PanelHeading>
          <DetailRows>
            <DetailRow label={t("reservations.detail.paidAmount")} value={`${deposit?.currency ?? "SAR"} ${deposit?.amount ?? 0}`} />
            <DetailRow label={t("reservations.detail.paidOn")} value={deposit?.paidOn ?? "—"} />
            <DetailRow label={t("reservations.detail.paymentMethod")} value={deposit?.method ?? "—"} />
            <DetailRow label={t("reservations.detail.transactionId")} value={deposit?.txnId ?? "—"} />
          </DetailRows>
        </Panel>
      );
      break;
    }

    case "failed":
      panel = (
        <>
          <MessageBox tone={TEXT_ERROR}>{t("reservations.detail.noAmountCaptured")}</MessageBox>
          <Panel>
            <DepositActions onRecordCash={onRecordCash} onWaiveDeposit={onWaiveDeposit} t={t} />
          </Panel>
        </>
      );
      break;

    case "expired":
      panel = (
        <>
          <MessageBox tone={TEXT_ERROR}>{t("reservations.detail.linkNoLongerValid")}</MessageBox>
          <Panel>
            <DepositActions onRecordCash={onRecordCash} onWaiveDeposit={onWaiveDeposit} t={t} />
          </Panel>
        </>
      );
      break;

    case "payment-cancelled":
      panel = <MessageBox tone={TEXT_ERROR}>{t("reservations.detail.guestCancelledPayment")}</MessageBox>;
      break;

    // Fix round 1, finding 2 — the same single message-box shape
    // failed/expired/payment-cancelled use, which is also how the
    // "Reservation Cancelled" frame draws it.
    case "cancelled":
      panel = (
        <>
          <MessageBox tone={TEXT_ERROR}>
            {t("reservations.list.row.cancelledOn").replace("{when}", reservation.cancelledAt ?? "—")}
            {reservation.cancelReason && <MessageNote>{reservation.cancelReason}</MessageNote>}
          </MessageBox>
          {/* The deposit's own state doesn't move to "refunded" on cancel —
              only a paid one that hasn't been refunded yet can still owe one,
              so that's the one signal available to decide whether to offer
              this. Attempting it when none is actually due surfaces the
              server's own refusal in the error banner, same as any other
              action here. */}
          {reservation.deposit?.state === "paid" && (
            <Panel>
              <PanelHeading>
                <span className={TEXT_PRIMARY}>{t("reservations.detail.refundDue")}</span>
              </PanelHeading>
              <button type="button" className={`${PANEL_BUTTON_TINTED} w-full`} onClick={onIssueRefund}>
                {t("reservations.detail.issueRefund")}
              </button>
            </Panel>
          )}
        </>
      );
      break;

    // Fix round 4, finding 5 — also not one of the eight frames. Same
    // message-box shape as "cancelled" above, reusing the row pill's own
    // No-show label as the message and, when the cancel dialog recorded a
    // reason/note for it (see model.ts's applyCancel), showing that too.
    case "no-show":
      panel = (
        <MessageBox tone={TEXT_SEC_GRAY}>
          {t("reservations.state.noShow")}
          {reservation.cancelReason && <MessageNote>{reservation.cancelReason}</MessageNote>}
        </MessageBox>
      );
      break;
  }

  let footer: ReactNode;
  switch (state) {
    case "confirmed":
    // Fix round 4, finding 5 — same footer shape as "confirmed": cancel,
    // message the guest, or edit all still make sense once the booking has
    // progressed further (Arrived/Seated/Completed).
    case "progressed":
      footer = (
        <>
          <MoreMenuButton onCancel={onCancel} t={t} />
          <SendMessageButton reservation={reservation} t={t} />
          <button type="button" className={FOOTER_PRIMARY} onClick={onEdit}>
            {t("reservations.detail.editReservation")}
          </button>
        </>
      );
      break;

    case "pending":
      footer = (
        <>
          <MoreMenuButton onCancel={onCancel} t={t} />
          {/* 261px in this frame; hugs its label in the link-sent one. */}
          <button type="button" className={clsx(FOOTER_TINTED_BLUE, "sm:w-[261px]")} onClick={onEdit}>
            {t("reservations.detail.editReservation")}
          </button>
          <button
            type="button"
            className={FOOTER_PRIMARY}
            // No deposit, no link to share (fix round 4, finding 9) —
            // disabled with a reason instead of the silent no-op this used
            // to be (onShareLink returned early with nothing visible
            // changing).
            disabled={!reservation.deposit}
            title={reservation.deposit ? undefined : t("reservations.detail.noDepositToShare")}
            onClick={onShareLink}
          >
            {t("reservations.detail.shareLink")}
          </button>
        </>
      );
      break;

    case "link-sent":
      footer = (
        <>
          <MoreMenuButton onCancel={onCancel} t={t} />
          <button type="button" className={FOOTER_TINTED_BLUE} onClick={onEdit}>
            {t("reservations.detail.editReservation")}
          </button>
          <button type="button" className={FOOTER_PRIMARY} onClick={onResendLink}>
            {t("reservations.detail.resendLink")}
          </button>
        </>
      );
      break;

    case "paid":
      footer = (
        <>
          <MoreMenuButton onCancel={onCancel} t={t} />
          <SendMessageButton reservation={reservation} t={t} />
          <button type="button" className={FOOTER_PRIMARY} onClick={downloadReceipt}>
            <ShellIcon name="rsv-modal-document-download.svg" size={24} />
            {t("reservations.detail.downloadReceipt")}
          </button>
        </>
      );
      break;

    case "failed":
      footer = (
        <>
          <button type="button" className={FOOTER_TINTED_RED} onClick={onCancel}>
            {t("reservations.detail.cancelReservation")}
          </button>
          <button type="button" className={FOOTER_TINTED_BLUE} onClick={notifyGuest}>
            {t("reservations.detail.notifyGuest")}
          </button>
          <button type="button" className={FOOTER_PRIMARY} onClick={onResendLink}>
            {t("reservations.detail.resendNewLink")}
          </button>
        </>
      );
      break;

    case "expired":
      footer = (
        <>
          <button type="button" className={FOOTER_TINTED_BLUE} onClick={notifyGuest}>
            {t("reservations.detail.notifyGuest")}
          </button>
          <button type="button" className={FOOTER_PRIMARY} onClick={onResendLink}>
            {t("reservations.detail.resendNewLink")}
          </button>
        </>
      );
      break;

    case "payment-cancelled":
      footer = (
        <button type="button" className={FOOTER_PRIMARY} onClick={onResendLink}>
          {t("reservations.detail.resendNewLink")}
        </button>
      );
      break;

    // Fix round 1, finding 2 — no payment action makes sense on a
    // cancelled reservation (nothing to resend a link or receipt for), so
    // this is the one footer that's just an edit affordance.
    case "cancelled":
    // Fix round 4, finding 5 — same reasoning for No-show: no payment or
    // messaging action fits a guest who never arrived.
    case "no-show":
      footer = (
        <button type="button" className={clsx(FOOTER_TINTED_BLUE, "w-full")} onClick={onEdit}>
          {t("reservations.detail.editReservation")}
        </button>
      );
      break;
  }

  const title = t("reservations.detail.title").replace("{ref}", reservation.ref);

  return (
    <Modal open={open} onClose={onClose} title={title} className={DIALOG_CLASS} backdropClassName={DIALOG_BACKDROP_CLASS}>
      <div className="flex flex-col gap-4">
        <DialogTitle>{title}</DialogTitle>
        {banner}
        {expired && onReinstate && (
          <Panel>
            <PanelHeading>
              <span className={`inline-flex items-center gap-2 ${TEXT_PRIMARY}`}>
                <ShellIcon name={ICON_ERROR_CIRCLE} size={24} className={TEXT_SEC_GRAY} />
                {extra.expiredTitle}
              </span>
            </PanelHeading>
            <p className={`text-[12px] font-medium leading-4 ${TEXT_SECONDARY}`}>{extra.expiredBody}</p>
            <button type="button" className={`${PANEL_BUTTON_PRIMARY} mt-1 w-full`} onClick={onReinstate}>
              {extra.reinstate}
            </button>
          </Panel>
        )}
        {guestCard}
        {metaRow}
        {panel}
        <div className="flex flex-wrap items-center gap-4">{footer}</div>
      </div>
    </Modal>
  );
}
