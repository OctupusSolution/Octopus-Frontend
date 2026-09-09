// Task 10: the reservation detail dialog. One component covers all eight
// design frames — the state shown (banner, panel and footer) is *derived*
// from the reservation, not passed in, via `detailState` in `_shared/model.ts`.
// Task 11 lifted the guest card and meta row out into
// `_shared/guest-card.tsx` / `_shared/meta-row.tsx` once the cancel dialog
// needed the same two pieces.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Copy,
  FileDown,
  Mail,
  MessageCircle,
  MoreVertical,
  Phone,
  Vault,
} from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation } from "@/shared/api/mock-reservations";
import { GuestCard } from "../_shared/guest-card";
import { MetaRow } from "../_shared/meta-row";
import { channelLabel, DEPOSIT_STATE_LABEL_KEY, detailState, STATE_LABEL_KEY, type DetailState } from "../_shared/model";
import { useDismiss } from "../_shared/use-dismiss";

export interface ReservationDetailModalProps {
  open: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onResendLink: () => void;
  onShareLink: () => void;
}

// Every tone reads off the `--octo-tone-*` tokens in index.css (fix round
// 4, finding 27) instead of a literal hex — dark mode's contrast fix lives
// in that one place, light stays byte-identical to the frames.
const BANNER_CLASS: Record<DetailState, string> = {
  confirmed: "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]",
  pending: "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)]",
  "link-sent": "bg-[var(--octo-tone-violet-bg)] text-[var(--octo-tone-violet-text)]",
  paid: "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]",
  failed: "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]",
  expired: "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
  "payment-cancelled": "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]",
  // Fix round 1, finding 2 — not one of the eight frames. A cancelled
  // reservation (status === "Cancelled") always wins over whatever its
  // deposit is doing; see detailState() in _shared/model.ts. Same red
  // treatment as "failed" since there's no cancelled-specific frame to
  // draw the banner language from.
  cancelled: "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]",
  // Fix round 4, finding 5 — also not one of the eight frames. "progressed"
  // (Arrived/Seated/Completed) reuses the same green as "confirmed"; the
  // booking is further along than confirmed, not in any kind of trouble.
  // "no-show" gets the same neutral slate as the row pill's own No-show tone.
  progressed: "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]",
  "no-show": "bg-[var(--octo-tone-slate-bg)] text-[var(--octo-tone-slate-text)]",
};

const BANNER_ICON: Record<DetailState, typeof CheckCircle2> = {
  confirmed: CheckCircle2,
  pending: AlertCircle,
  "link-sent": AlertCircle,
  paid: CheckCircle2,
  failed: AlertCircle,
  expired: AlertCircle,
  "payment-cancelled": AlertCircle,
  cancelled: AlertCircle,
  progressed: CheckCircle2,
  "no-show": AlertCircle,
};

// The eight frames' own banner copy — distinct from the row pill's plainer
// state labels (e.g. "Payment Link Sent" here vs. "Link Sent" on the pill).
// "progressed" and "no-show" (fix round 4, finding 5) aren't in this map —
// build only from existing i18n keys and the design language already
// established (there are no frames for these two), so their banner text is
// resolved from the reservation's own status via STATE_LABEL_KEY instead;
// see the `banner` JSX below.
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
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="inline-flex items-center gap-1.5 text-[var(--octo-text-secondary)]">
        {icon}
        {label}
      </span>
      <span className={clsx("font-medium text-[var(--octo-text-primary)]", valueClassName)}>{value}</span>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-[9px] border border-[var(--octo-border-card)] p-3.5">{children}</div>;
}

function PanelHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("mb-3 flex items-center justify-between border-b border-[var(--octo-divider)] pb-3", className)}>
      {children}
    </div>
  );
}

// The plain single-line boxes for failed / expired / payment-cancelled — no
// heading, just a bordered box holding one line of red (or grey) text.
function MessageBox({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <div className="rounded-[9px] border border-[var(--octo-border-card)] px-3.5 py-3 text-[12.5px] font-medium" style={{ color: tone }}>
      {children}
    </div>
  );
}

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
    { key: "whatsapp", href: `https://wa.me/${digits}`, icon: <MessageCircle size={14} className="text-[#25D366]" />, label: t("reservations.list.row.whatsapp") },
    { key: "call", href: `tel:${reservation.phone}`, icon: <Phone size={14} className="text-[#0D6EFD]" />, label: t("reservations.list.row.call") },
    {
      key: "email",
      href: reservation.email ? `mailto:${reservation.email}` : undefined,
      icon: <Mail size={14} className="text-[var(--octo-text-muted)]" />,
      label: t("reservations.list.row.email"),
    },
  ];

  return (
    <div ref={ref} className="relative">
      <Button
        variant="secondary"
        className="!border-transparent !bg-[var(--octo-tone-info-bg)] !text-[var(--octo-tone-info-text)] hover:!bg-[var(--octo-tone-info-bg)]"
        onClick={() => setOpen((v) => !v)}
      >
        {t("reservations.detail.sendMessage")}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute top-full start-0 z-20 mt-1.5 w-44 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1 shadow-lg"
        >
          {items.map((item) =>
            item.href ? (
              <a
                key={item.key}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[12px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
              >
                {item.icon}
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
                className="flex w-full cursor-not-allowed items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[12px] text-[var(--octo-text-faint)]"
              >
                {item.icon}
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
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("reservations.list.row.more")}
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-[var(--octo-track)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full start-0 z-20 mb-1.5 w-44 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCancel();
              setOpen(false);
            }}
            className="flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] text-[#EF4444] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {t("reservations.detail.cancelReservation")}
          </button>
        </div>
      )}
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
}: ReservationDetailModalProps) {
  const { t } = useI18n();
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
  const noBackend = t("reservations.list.actions.noBackend");

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

  const BannerIcon = BANNER_ICON[state];
  // "progressed"/"no-show" have no frame-specific banner copy (fix round
  // 4, finding 5) — their label is the reservation's own status label
  // (Arrived/Seated/Completed/No-show), reusing STATE_LABEL_KEY rather
  // than inventing new detail-only copy.
  const bannerLabelKey = BANNER_LABEL_KEY[state] ?? STATE_LABEL_KEY[reservation.status];

  const banner = (
    <div className={clsx("flex items-center gap-2 rounded-[9px] px-3.5 py-2.5 text-[13px] font-semibold", BANNER_CLASS[state])}>
      <BannerIcon size={16} className="shrink-0" />
      {t(bannerLabelKey)}
    </div>
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
            <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[var(--octo-tone-success-text)]">
              <CheckCircle2 size={16} />
              {t("reservations.detail.confirmedPanel")}
            </span>
          </PanelHeading>
          <div className="space-y-2.5">
            <DetailRow label={t("reservations.detail.confirmedOn")} value={reservation.confirmedOn ?? "—"} />
            <DetailRow label={t("reservations.detail.confirmedMethod")} value={reservation.confirmedMethod ?? "—"} />
          </div>
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
              <span className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                {t("reservations.detail.depositInfo")}
              </span>
              <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
                {deposit?.currency ?? "SAR"} {deposit?.amount ?? 0}{" "}
                <span className="font-normal text-[var(--octo-text-muted)]">{t("reservations.detail.required")}</span>
              </span>
            </PanelHeading>
            <div className="space-y-2.5">
              <DetailRow
                icon={<CircleDashed size={14} className="text-[var(--octo-text-muted)]" />}
                label={t("reservations.detail.status")}
                value={t(depositStateKey)}
                valueClassName="!text-[var(--octo-tone-warning-text)]"
              />
              <DetailRow
                icon={<Vault size={14} className="text-[var(--octo-text-muted)]" />}
                label={t("reservations.detail.depositAmount")}
                value={`${deposit?.currency ?? "SAR"} ${deposit?.amount ?? 0}`}
              />
              <DetailRow
                icon={<Clock size={14} className="text-[var(--octo-text-muted)]" />}
                label={t("reservations.detail.dueBy")}
                value={deposit?.dueBy ?? "—"}
              />
            </div>
          </Panel>
          <div className="mt-3 flex items-center gap-2 rounded-[9px] bg-[var(--octo-tone-warning-bg)] px-3.5 py-2.5 text-[12px] text-[var(--octo-tone-warning-text)]">
            <AlertCircle size={14} className="shrink-0" />
            {t("reservations.detail.autoConfirmNote")}
          </div>
        </>
      );
      break;
    }

    case "link-sent": {
      const link = reservation.paymentLink;
      panel = (
        <Panel>
          <PanelHeading>
            <span className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.detail.linkPanel")}</span>
          </PanelHeading>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-[9px] border border-[var(--octo-tone-info-text)]/20 bg-[var(--octo-tone-info-bg)] px-3 py-2.5">
              <a
                href={link?.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="truncate text-[12.5px] font-semibold text-[var(--octo-tone-info-text)] hover:underline"
              >
                {link?.url}
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 text-[11.5px] font-medium text-[var(--octo-tone-info-text)] transition-opacity hover:opacity-75"
                aria-label={t("reservations.detail.copyLink")}
              >
                {copied ? t("reservations.detail.copied") : <Copy size={14} />}
              </button>
            </div>
            <div className="space-y-2.5">
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
            </div>
          </div>
        </Panel>
      );
      break;
    }

    case "paid": {
      const deposit = reservation.deposit;
      panel = (
        <Panel>
          <PanelHeading>
            <span className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
              {t("reservations.detail.paymentSuccessful")}
            </span>
          </PanelHeading>
          <div className="space-y-2.5">
            <DetailRow label={t("reservations.detail.paidAmount")} value={`${deposit?.currency ?? "SAR"} ${deposit?.amount ?? 0}`} />
            <DetailRow label={t("reservations.detail.paidOn")} value={deposit?.paidOn ?? "—"} />
            <DetailRow label={t("reservations.detail.paymentMethod")} value={deposit?.method ?? "—"} />
            <DetailRow label={t("reservations.detail.transactionId")} value={deposit?.txnId ?? "—"} />
          </div>
        </Panel>
      );
      break;
    }

    case "failed":
      panel = <MessageBox tone="var(--octo-tone-danger-text)">{t("reservations.detail.noAmountCaptured")}</MessageBox>;
      break;

    case "expired":
      panel = <MessageBox tone="var(--octo-tone-danger-text)">{t("reservations.detail.linkNoLongerValid")}</MessageBox>;
      break;

    case "payment-cancelled":
      panel = <MessageBox tone="var(--octo-tone-danger-text)">{t("reservations.detail.guestCancelledPayment")}</MessageBox>;
      break;

    // Fix round 1, finding 2 — not one of the eight frames (there's no
    // "cancelled reservation" frame among them). Built from the same
    // single message-box shape failed/expired/payment-cancelled already
    // use, rather than inventing new furniture for a state the design
    // never drew.
    case "cancelled":
      panel = (
        <MessageBox tone="var(--octo-tone-danger-text)">
          {t("reservations.list.row.cancelledOn").replace("{when}", reservation.cancelledAt ?? "—")}
          {reservation.cancelReason && (
            <span className="mt-1 block text-[var(--octo-text-muted)]">{reservation.cancelReason}</span>
          )}
        </MessageBox>
      );
      break;

    // Fix round 4, finding 5 — also not one of the eight frames. Same
    // message-box shape as "cancelled" above, reusing the row pill's own
    // No-show label as the message and, when the cancel dialog recorded a
    // reason/note for it (see model.ts's applyCancel), showing that too.
    case "no-show":
      panel = (
        <MessageBox tone="var(--octo-tone-slate-text)">
          {t("reservations.state.noShow")}
          {reservation.cancelReason && (
            <span className="mt-1 block text-[var(--octo-text-muted)]">{reservation.cancelReason}</span>
          )}
        </MessageBox>
      );
      break;
  }

  // Every tinted footer button below reads off the `--octo-tone-*` tokens
  // (fix round 4, finding 27), not a literal hex, for the same dark-mode
  // contrast reason as BANNER_CLASS above.
  const tintedBlue = "!border-transparent !bg-[var(--octo-tone-info-bg)] !text-[var(--octo-tone-info-text)] hover:!bg-[var(--octo-tone-info-bg)]";
  const tintedRed = "!border-transparent !bg-[var(--octo-tone-danger-bg)] !text-[var(--octo-tone-danger-text)] hover:!bg-[var(--octo-tone-danger-bg)]";

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
          <Button variant="primary" className="flex-1 justify-center" onClick={onEdit}>
            {t("reservations.detail.editReservation")}
          </Button>
        </>
      );
      break;

    case "pending":
      footer = (
        <>
          <MoreMenuButton onCancel={onCancel} t={t} />
          <Button variant="secondary" className={tintedBlue} onClick={onEdit}>
            {t("reservations.detail.editReservation")}
          </Button>
          <Button
            variant="primary"
            className="flex-1 justify-center"
            // No deposit, no link to share (fix round 4, finding 9) —
            // disabled with a reason instead of the silent no-op this used
            // to be (onShareLink returned early with nothing visible
            // changing).
            disabled={!reservation.deposit}
            title={reservation.deposit ? undefined : t("reservations.detail.noDepositToShare")}
            onClick={onShareLink}
          >
            {t("reservations.detail.shareLink")}
          </Button>
        </>
      );
      break;

    case "link-sent":
      footer = (
        <>
          <MoreMenuButton onCancel={onCancel} t={t} />
          <Button variant="secondary" className={tintedBlue} onClick={onEdit}>
            {t("reservations.detail.editReservation")}
          </Button>
          <Button variant="primary" className="flex-1 justify-center" onClick={onResendLink}>
            {t("reservations.detail.resendLink")}
          </Button>
        </>
      );
      break;

    case "paid":
      footer = (
        <>
          <MoreMenuButton onCancel={onCancel} t={t} />
          <Button
            variant="secondary"
            icon={<FileDown size={14} />}
            disabled
            title={noBackend}
            className={clsx("!flex-1 !justify-center", tintedBlue)}
          >
            {t("reservations.detail.downloadReceipt")}
          </Button>
        </>
      );
      break;

    case "failed":
      footer = (
        <>
          <Button variant="secondary" className={tintedRed} onClick={onCancel}>
            {t("reservations.detail.cancelReservation")}
          </Button>
          <Button variant="secondary" disabled title={noBackend} className={tintedBlue}>
            {t("reservations.detail.notifyGuest")}
          </Button>
          <Button variant="primary" className="flex-1 justify-center" onClick={onResendLink}>
            {t("reservations.detail.resendNewLink")}
          </Button>
        </>
      );
      break;

    case "expired":
      footer = (
        <>
          <Button variant="secondary" disabled title={noBackend} className={tintedBlue}>
            {t("reservations.detail.notifyGuest")}
          </Button>
          <Button variant="primary" className="flex-1 justify-center" onClick={onResendLink}>
            {t("reservations.detail.resendNewLink")}
          </Button>
        </>
      );
      break;

    case "payment-cancelled":
      footer = (
        <Button variant="primary" className="flex-1 justify-center" onClick={onResendLink}>
          {t("reservations.detail.resendNewLink")}
        </Button>
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
        <Button variant="secondary" className="w-full justify-center" onClick={onEdit}>
          {t("reservations.detail.editReservation")}
        </Button>
      );
      break;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("reservations.detail.title").replace("{ref}", reservation.ref)}
      className="!max-w-[620px]"
      footer={footer}
    >
      <div className="space-y-3">
        {banner}
        {guestCard}
        {metaRow}
        {panel}
      </div>
    </Modal>
  );
}
