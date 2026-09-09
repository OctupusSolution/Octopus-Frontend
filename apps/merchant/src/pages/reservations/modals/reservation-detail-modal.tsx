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
import { detailState, type DetailState } from "../_shared/model";
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

const BANNER_CLASS: Record<DetailState, string> = {
  confirmed: "bg-[#16A34A]/10 text-[#15803D]",
  pending: "bg-[#F59E0B]/10 text-[#B45309]",
  "link-sent": "bg-[#7C3AED]/10 text-[#6D28D9]",
  paid: "bg-[#16A34A]/10 text-[#15803D]",
  failed: "bg-[#EF4444]/10 text-[#DC2626]",
  expired: "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
  "payment-cancelled": "bg-[#EF4444]/10 text-[#DC2626]",
  // Fix round 1, finding 2 — not one of the eight frames. A cancelled
  // reservation (status === "Cancelled") always wins over whatever its
  // deposit is doing; see detailState() in _shared/model.ts. Same red
  // treatment as "failed" since there's no cancelled-specific frame to
  // draw the banner language from.
  cancelled: "bg-[#EF4444]/10 text-[#DC2626]",
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
};

const BANNER_LABEL_KEY: Record<DetailState, string> = {
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
        className="!border-transparent !bg-[#0D6EFD]/10 !text-[#0D6EFD] hover:!bg-[#0D6EFD]/15"
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

  const banner = (
    <div className={clsx("flex items-center gap-2 rounded-[9px] px-3.5 py-2.5 text-[13px] font-semibold", BANNER_CLASS[state])}>
      <BannerIcon size={16} className="shrink-0" />
      {t(BANNER_LABEL_KEY[state])}
    </div>
  );

  const guestCard = <GuestCard reservation={reservation} />;
  const metaRow = <MetaRow reservation={reservation} />;

  let panel: ReactNode;
  switch (state) {
    case "confirmed":
      panel = (
        <Panel>
          <PanelHeading>
            <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#15803D]">
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
                value={t("reservations.list.row.unpaid")}
                valueClassName="!text-[#B45309]"
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
          <div className="mt-3 flex items-center gap-2 rounded-[9px] bg-[#F59E0B]/10 px-3.5 py-2.5 text-[12px] text-[#B45309]">
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
            <div className="flex items-center justify-between gap-2 rounded-[9px] border border-[#0D6EFD]/20 bg-[#0D6EFD]/[0.06] px-3 py-2.5">
              <a
                href={link?.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="truncate text-[12.5px] font-semibold text-[#0D6EFD] hover:underline"
              >
                {link?.url}
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 text-[11.5px] font-medium text-[#0D6EFD] transition-opacity hover:opacity-75"
                aria-label={t("reservations.detail.copyLink")}
              >
                {copied ? t("reservations.detail.copied") : <Copy size={14} />}
              </button>
            </div>
            <div className="space-y-2.5">
              <DetailRow label={t("reservations.detail.sentVia")} value={link?.sentVia ?? "—"} />
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
      panel = <MessageBox tone="#DC2626">{t("reservations.detail.noAmountCaptured")}</MessageBox>;
      break;

    case "expired":
      panel = <MessageBox tone="#DC2626">{t("reservations.detail.linkNoLongerValid")}</MessageBox>;
      break;

    case "payment-cancelled":
      panel = <MessageBox tone="#DC2626">{t("reservations.detail.guestCancelledPayment")}</MessageBox>;
      break;

    // Fix round 1, finding 2 — not one of the eight frames (there's no
    // "cancelled reservation" frame among them). Built from the same
    // single message-box shape failed/expired/payment-cancelled already
    // use, rather than inventing new furniture for a state the design
    // never drew.
    case "cancelled":
      panel = (
        <MessageBox tone="#DC2626">
          {t("reservations.list.row.cancelledOn").replace("{when}", reservation.cancelledAt ?? "—")}
          {reservation.cancelReason && (
            <span className="mt-1 block text-[var(--octo-text-muted)]">{reservation.cancelReason}</span>
          )}
        </MessageBox>
      );
      break;
  }

  let footer: ReactNode;
  switch (state) {
    case "confirmed":
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
          <Button
            variant="secondary"
            className="!border-transparent !bg-[#0D6EFD]/10 !text-[#0D6EFD] hover:!bg-[#0D6EFD]/15"
            onClick={onEdit}
          >
            {t("reservations.detail.editReservation")}
          </Button>
          <Button variant="primary" className="flex-1 justify-center" onClick={onShareLink}>
            {t("reservations.detail.shareLink")}
          </Button>
        </>
      );
      break;

    case "link-sent":
      footer = (
        <>
          <MoreMenuButton onCancel={onCancel} t={t} />
          <Button
            variant="secondary"
            className="!border-transparent !bg-[#0D6EFD]/10 !text-[#0D6EFD] hover:!bg-[#0D6EFD]/15"
            onClick={onEdit}
          >
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
            className="!flex-1 !justify-center !border-transparent !bg-[#0D6EFD]/10 !text-[#0D6EFD] hover:!bg-[#0D6EFD]/15"
          >
            {t("reservations.detail.downloadReceipt")}
          </Button>
        </>
      );
      break;

    case "failed":
      footer = (
        <>
          <Button
            variant="secondary"
            className="!border-transparent !bg-[#EF4444]/10 !text-[#DC2626] hover:!bg-[#EF4444]/15"
            onClick={onCancel}
          >
            {t("reservations.detail.cancelReservation")}
          </Button>
          <Button
            variant="secondary"
            disabled
            title={noBackend}
            className="!border-transparent !bg-[#0D6EFD]/10 !text-[#0D6EFD] hover:!bg-[#0D6EFD]/15"
          >
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
          <Button
            variant="secondary"
            disabled
            title={noBackend}
            className="!border-transparent !bg-[#0D6EFD]/10 !text-[#0D6EFD] hover:!bg-[#0D6EFD]/15"
          >
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
