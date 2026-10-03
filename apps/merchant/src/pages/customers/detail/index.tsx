// apps/merchant/src/pages/customers/detail/index.tsx
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { customerActions, useCustomers, useCustomerSync } from "../_shared/customer-store";
import { customerName, formatDate, formatReservationDateTime, formatSar, formatSarWhole } from "../_shared/format";
import { Avatar } from "../_shared/avatar";
import { TagChips } from "../_shared/tag-chips";
import { Toast, useToast } from "../_shared/toast";
import { WhatsAppGlyph } from "../_shared/whatsapp-glyph";
import { PAYMENT_STATUS_STYLE, RESERVATION_STATUS_STYLE } from "../_shared/theme";
import { PaymentLinkModal } from "../_shared/payment-link-modal";
import { AddNoteModal } from "../_shared/add-note-modal";
import { AddTagModal } from "../_shared/add-tag-modal";
import { EditInfoModal } from "../_shared/edit-info-modal";
import { actionErrorKey } from "../_shared/crm-api";

const PAGE_CLASS = "px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8";
const LINE_COLOR = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";
const CARD_BORDER = `border ${LINE_COLOR}`;
const LINK_COLOR = "text-[#0058da] [[data-theme=dark]_&]:text-[#60a5fa]";
const ROW_CLASS = `flex items-center gap-2 rounded-[12px] bg-[var(--octo-card)] p-2 shadow-[0_0_4px_rgba(0,0,0,0.08)] ${CARD_BORDER}`;
const PILL_CLASS = "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-[12px]";
// The frame sets line-height equal to font-size; a truncated line would clip
// its descenders at that height, so the clip box is padded and pulled back.
const CLIP_SAFE = "-my-[3px] truncate py-[3px]";

interface StatTileStyle {
  icon: string;
  badge: string;
  surface: string;
}

// Tile colours are this frame's own; in dark mode the pastel is rebuilt from
// the badge colour over the card surface.
const STAT_TILE = {
  totalVisits: { icon: "crm-detail-location.svg", badge: "bg-[#0063f6]", surface: "bg-[#f0f6ff] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#0063f6_14%,var(--octo-card))]" },
  totalSpend: { icon: "crm-detail-moneys.svg", badge: "bg-[#009a39]", surface: "bg-[#f3fff7] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#009a39_14%,var(--octo-card))]" },
  lastVisit: { icon: "crm-detail-clock.svg", badge: "bg-[#c53395]", surface: "bg-[#fff3fb] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#c53395_14%,var(--octo-card))]" },
  loyaltyPoints: { icon: "crm-detail-star.svg", badge: "bg-[#cc9934]", surface: "bg-[#fff8ea] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#cc9934_14%,var(--octo-card))]" },
  avgSpend: { icon: "crm-detail-activity.svg", badge: "bg-[#8735e4]", surface: "bg-[#f9f3ff] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#8735e4_14%,var(--octo-card))]" },
} satisfies Record<string, StatTileStyle>;

// Per-button look of the action row. The light values are the frame's; the
// dark ones rebuild each pastel as a tint over the card surface.
const ACTION_STYLE = {
  newReservations: "gap-1 border border-[#cccba8] bg-[#fffedc] px-2 text-[#696700] [[data-theme=dark]_&]:border-[#e0dc5a]/30 [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#e0dc5a_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#e0dc5a]",
  paymentLink: "gap-1 border border-[#ebc0ff] bg-[#f8e9ff] px-2 text-[#7600b1] [[data-theme=dark]_&]:border-[#c77dff]/30 [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#c77dff_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#c77dff]",
  whatsapp: "gap-1 bg-[#f2f9f3] px-3 text-[#009a39] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#22c55e_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#22c55e]",
  email: "gap-1 bg-[#f5f9ff] px-3 text-[#0d6efd] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#0d6efd_14%,var(--octo-card))] [[data-theme=dark]_&]:text-[#60a5fa]",
  addTag: "gap-2 border border-[#e2e8f0] bg-[var(--octo-card)] px-4 text-[var(--octo-text-secondary)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]",
  block: `gap-2 border px-4 text-[var(--octo-text-secondary)] ${LINE_COLOR}`,
  delete: "gap-2 bg-[#fef0f0] px-4 text-[#d30202] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#ef4444_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#f87171]",
} satisfies Record<string, string>;

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  useCustomerSync(id);
  const customer = useCustomers().find((c) => c.id === id);
  const [toast, showToast, toastTone] = useToast();
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [aboutEditOpen, setAboutEditOpen] = useState(false);
  const [preferencesEditOpen, setPreferencesEditOpen] = useState(false);

  const heading = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate("/customers")}
        aria-label={t("customers.detail.back")}
        title={t("customers.detail.back")}
        className="-my-1 grid h-8 w-8 place-items-center rounded-[8px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <ArrowLeft size={20} className="rtl:rotate-180" />
      </button>
      <h1 className="text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">{t("customers.detail.title")}</h1>
    </div>
  );

  if (!customer) {
    return (
      <div className={PAGE_CLASS}>
        {heading}
        <EmptyState className="mt-8 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]" icon={<Users size={18} />} title={t("customers.detail.notFound")} />
      </div>
    );
  }

  const current = customer;
  /** Runs a store action and confirms it, or says why the server refused it. */
  function run(action: Promise<unknown>, confirmation: string) {
    action.then(
      () => showToast(confirmation),
      (err: unknown) => showToast(t(actionErrorKey(err)), "error")
    );
  }

  const name = customerName(customer);
  const localeTag = locale === "ar" ? "ar-SA" : "en-US";
  const editIcon = <ShellIcon name="crm-detail-edit.svg" size={24} />;

  return (
    <div className={PAGE_CLASS}>
      {heading}

      <header className={`mt-8 flex flex-wrap items-center justify-between gap-y-4 rounded-[24px] p-3 xl:flex-nowrap ${CARD_BORDER}`}>
        <div className={`flex w-full min-w-0 items-start gap-3 pe-2 xl:w-[367px] xl:shrink-0 xl:border-e ${LINE_COLOR}`}>
          <Avatar name={name} photo={customer.avatarUrl} size={80} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className={`text-[16px] font-medium leading-[16px] text-[var(--octo-text-primary)] ${CLIP_SAFE}`}>{name}</div>
            <TagChips tags={customer.tags} blocked={customer.isBlocked} />
            <div className="flex items-center gap-1 text-[12px] font-medium leading-[12px] text-[var(--octo-text-secondary)]">
              <WhatsAppGlyph size={12} /> <span dir="ltr">{customer.phone}</span>
            </div>
            <div className="flex min-w-0 items-center gap-1 text-[12px] font-medium leading-[12px] text-[var(--octo-text-secondary)]">
              <ShellIcon name="crm-detail-sms.svg" size={12} /> <span className={CLIP_SAFE}>{customer.email || "—"}</span>
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:w-auto xl:flex-1 xl:px-[13px]">
          <StatTile label={t("customers.detail.totalVisits")} value={String(customer.visits)} tile={STAT_TILE.totalVisits} />
          <StatTile label={t("customers.detail.totalSpend")} value={formatSarWhole(customer.totalSpendSar)} tile={STAT_TILE.totalSpend} />
          <StatTile label={t("customers.detail.lastVisit")} value={formatDate(customer.lastVisit, locale)} tile={STAT_TILE.lastVisit} />
          <StatTile
            label={t("customers.detail.loyaltyPoints")}
            value={t("customers.detail.pointsValue").replace("{points}", customer.loyaltyPoints.toLocaleString(localeTag))}
            tile={STAT_TILE.loyaltyPoints}
          />
          <StatTile label={t("customers.detail.avgSpend")} value={formatSarWhole(customer.avgSpendSar)} tile={STAT_TILE.avgSpend} />
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title={t("customers.detail.about.title")}
          action={<PanelIconButton label={t("customers.detail.editAbout.title")} onClick={() => setAboutEditOpen(true)} icon={editIcon} className={LINK_COLOR} />}
        >
          <dl className="flex flex-col gap-3">
            <InfoRow label={t("customers.detail.about.customerSince")} value={formatDate(customer.customerSince, locale)} />
            <InfoRow label={t("customers.detail.about.firstVisit")} value={formatDate(customer.firstVisit, locale)} />
            <InfoRow label={t("customers.detail.about.preferredBranch")} value={customer.preferredBranch || "—"} />
            <InfoRow label={t("customers.detail.about.preferredAreaTable")} value={customer.preferredAreaTable || "—"} />
            {customer.vipSince && <InfoRow label={t("customers.detail.about.vipSince")} value={formatDate(customer.vipSince, locale)} />}
            <InfoRow label={t("customers.detail.about.referredBy")} value={customer.referredBy ?? "—"} />
            <InfoRow label={t("customers.detail.about.marketingConsent")} value={t(customer.marketingConsent === "Opted in" ? "customers.marketingConsent.optedIn" : "customers.marketingConsent.optedOut")} />
          </dl>
        </Panel>

        <Panel
          title={t("customers.detail.preferences.title")}
          action={<PanelIconButton label={t("customers.detail.editPreferences.title")} onClick={() => setPreferencesEditOpen(true)} icon={editIcon} className={LINK_COLOR} />}
        >
          <dl className="flex flex-col gap-3">
            <InfoRow label={t("customers.detail.preferences.cuisine")} value={customer.cuisinePreference.join(", ") || "—"} />
            <InfoRow label={t("customers.detail.preferences.dietary")} value={customer.dietaryPreference || "—"} />
            <InfoRow label={t("customers.detail.preferences.occasion")} value={customer.occasion || "—"} />
            <InfoRow label={t("customers.detail.preferences.visitTime")} value={customer.visitTime || "—"} />
            <InfoRow
              label={t("customers.detail.preferences.communication")}
              value={customer.communicationPreference.map((c) => t(`customers.addCustomer.channel.${c.toLowerCase()}`)).join(", ") || "—"}
            />
            <InfoRow label={t("customers.detail.preferences.specialRequests")} value={customer.specialRequests || "—"} />
          </dl>
        </Panel>

        <Panel
          title={t("customers.detail.notes.title")}
          action={
            <PanelIconButton
              label={t("customers.addNote.title")}
              onClick={() => setNoteOpen(true)}
              // Exported at its own 21.5px bounds, inset in the frame's 24px slot.
              icon={<ShellIcon name="crm-detail-chat-add.svg" size={21.5} />}
              className="text-[#0d6efd] [[data-theme=dark]_&]:text-[#60a5fa]"
            />
          }
        >
          {customer.notes.length === 0 ? (
            <p className="text-[12px] font-medium text-[var(--octo-text-muted)]">{t("customers.detail.notes.empty")}</p>
          ) : (
            <ul className="flex list-disc flex-col gap-3 ps-[18px] text-[12px] font-medium leading-[1.4] text-[var(--octo-text-primary)] marker:text-[var(--octo-text-primary)]">
              {customer.notes.map((note, index) => (
                <li key={index}>
                  <span className="font-bold">{formatDate(note.date, locale)}</span> - {note.text}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ListPanel title={t("customers.detail.reservations.title")} viewAllTo="/reservations" empty={customer.recentReservations.length === 0}>
          {customer.recentReservations.map((res, index) => {
            const style = RESERVATION_STATUS_STYLE[res.status];
            return (
              <li key={index} className={ROW_CLASS}>
                <ShellIcon name="crm-detail-calendar.svg" size={24} className="text-[var(--octo-text-primary)]" />
                <div className="flex min-w-0 flex-1 flex-col gap-2 font-medium">
                  <div className={`text-[14px] leading-[14px] text-[var(--octo-text-primary)] ${CLIP_SAFE}`}>{formatReservationDateTime(res.date, locale)}</div>
                  <div className={`text-[12px] leading-[12px] text-[var(--octo-text-secondary)] ${CLIP_SAFE}`}>{res.table} - {res.guests} {t("customers.detail.guests")}</div>
                </div>
                <span className={PILL_CLASS} style={{ color: style.text, backgroundColor: style.bg }}>
                  <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: style.text }} />
                  {t(`customers.detail.reservationStatus.${res.status.toLowerCase()}`)}
                </span>
              </li>
            );
          })}
        </ListPanel>

        <ListPanel title={t("customers.detail.orders.title")} viewAllTo="/orders" empty={customer.recentOrders.length === 0}>
          {customer.recentOrders.map((order) => (
            <li key={order.id} className={ROW_CLASS}>
              <ShellIcon name="crm-detail-food.svg" size={24} className="text-[var(--octo-text-primary)]" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className={`text-[12px] font-medium leading-[12px] text-[var(--octo-text-primary)] ${CLIP_SAFE}`}>{formatDate(order.date, locale)} - {order.id}</div>
                <div className={`text-[12px] leading-[12px] text-[var(--octo-text-secondary)] ${CLIP_SAFE}`}>{order.items}</div>
                <div className={`text-[14px] font-bold leading-[14px] ${LINK_COLOR}`}>{formatSar(order.totalSar)}</div>
              </div>
            </li>
          ))}
        </ListPanel>

        <ListPanel title={t("customers.detail.payments.title")} viewAllTo="/finance/payments" empty={customer.recentPayments.length === 0}>
          {customer.recentPayments.map((payment, index) => {
            const style = PAYMENT_STATUS_STYLE[payment.status];
            return (
              <li key={index} className={ROW_CLASS}>
                <ShellIcon name="crm-detail-card.svg" size={24} className="text-[var(--octo-text-primary)]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="text-[12px] leading-[12px] text-[var(--octo-text-secondary)]">{formatDate(payment.date, locale)}</div>
                  <div className="text-[12px] font-medium leading-[12px] text-[var(--octo-text-primary)]">
                    <bdi dir="ltr">{payment.cardLast4 ? `**** **** **** ${payment.cardLast4}` : payment.method ?? "—"}</bdi>
                  </div>
                  <div className={`text-[14px] font-bold leading-[14px] ${LINK_COLOR}`}>{formatSar(payment.amountSar)}</div>
                </div>
                <span className={PILL_CLASS} style={{ color: style.text, backgroundColor: style.bg }}>
                  {t(`customers.detail.${payment.status.toLowerCase()}`)}
                </span>
              </li>
            );
          })}
        </ListPanel>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:flex">
        <DetailAction
          className={ACTION_STYLE.newReservations}
          // The frame draws these two 16px glyphs a shade lighter than their label.
          icon={<ShellIcon name="crm-detail-calendar-16.svg" size={16} className="text-[#878533] [[data-theme=dark]_&]:text-current" />}
          label={t("customers.row.newReservations")}
          onClick={() => navigate("/reservations/new")}
        />
        <DetailAction
          className={ACTION_STYLE.paymentLink}
          icon={<ShellIcon name="crm-detail-link.svg" size={16} className="text-[#9133c1] [[data-theme=dark]_&]:text-current" />}
          label={t("customers.row.paymentLink")}
          onClick={() => setPaymentLinkOpen(true)}
        />
        <DetailAction
          className={ACTION_STYLE.whatsapp}
          icon={<WhatsAppGlyph size={24} />}
          label={t("customers.rowAction.sendWhatsapp")}
          onClick={() => showToast(t("customers.rowAction.whatsappSent"))}
        />
        <DetailAction
          className={ACTION_STYLE.email}
          icon={<ShellIcon name="crm-detail-export.svg" size={24} />}
          label={t("customers.rowAction.sendEmail")}
          onClick={() => showToast(t("customers.rowAction.emailSent"))}
        />
        <DetailAction
          className={ACTION_STYLE.addTag}
          icon={<IconSlot><ShellIcon name="crm-detail-tag.svg" size={21} /></IconSlot>}
          label={t("customers.rowAction.addTag")}
          onClick={() => setTagOpen(true)}
        />
        <DetailAction
          className={ACTION_STYLE.block}
          icon={<IconSlot><ShellIcon name="crm-detail-block.svg" size={21.5} /></IconSlot>}
          label={t(customer.isBlocked ? "customers.rowAction.unblock" : "customers.rowAction.block")}
          onClick={() => {
            run(customerActions.toggleBlocked(current.id), t(customer.isBlocked ? "customers.rowAction.unblocked" : "customers.rowAction.blocked"));
          }}
        />
        <DetailAction
          className={ACTION_STYLE.delete}
          icon={<ShellIcon name="crm-detail-trash.svg" size={24} />}
          label={t("customers.rowAction.delete")}
          onClick={() => {
            if (!window.confirm(t("customers.rowAction.deleteConfirm"))) return;
            customerActions.remove([current.id]).then(
              () => navigate("/customers"),
              (err: unknown) => showToast(t(actionErrorKey(err)), "error")
            );
          }}
        />
      </div>

      <Toast message={toast} tone={toastTone} />
      <PaymentLinkModal customer={paymentLinkOpen ? customer : null} onClose={() => setPaymentLinkOpen(false)} onSent={() => showToast(t("customers.paymentLink.sentConfirm"))} />
      <AddNoteModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        onSave={(text) => {
          run(customerActions.addNote(current.id, text), t("customers.addNote.savedConfirm"));
        }}
      />
      <AddTagModal
        open={tagOpen}
        onClose={() => setTagOpen(false)}
        onSave={(tag) => {
          run(customerActions.addTag([current.id], tag), t("customers.addTag.savedConfirm").replace("{tag}", tag));
        }}
      />
      <EditInfoModal
        open={aboutEditOpen}
        title={t("customers.detail.editAbout.title")}
        saveLabel={t("customers.detail.save")}
        fields={[
          { key: "preferredBranch", label: t("customers.detail.about.preferredBranch"), value: customer.preferredBranch },
          { key: "preferredAreaTable", label: t("customers.detail.about.preferredAreaTable"), value: customer.preferredAreaTable },
          { key: "referredBy", label: t("customers.detail.about.referredBy"), value: customer.referredBy ?? "" },
        ]}
        onClose={() => setAboutEditOpen(false)}
        onSave={(values) => {
          run(
            customerActions.saveAbout(current.id, {
              preferredBranch: values.preferredBranch,
              preferredAreaTable: values.preferredAreaTable,
              referredBy: values.referredBy.trim() || undefined,
            }),
            t("customers.detail.savedConfirm")
          );
        }}
      />
      <EditInfoModal
        open={preferencesEditOpen}
        title={t("customers.detail.editPreferences.title")}
        saveLabel={t("customers.detail.save")}
        fields={[
          { key: "cuisinePreference", label: t("customers.detail.preferences.cuisine"), value: customer.cuisinePreference.join(", ") },
          { key: "dietaryPreference", label: t("customers.detail.preferences.dietary"), value: customer.dietaryPreference },
          { key: "occasion", label: t("customers.detail.preferences.occasion"), value: customer.occasion },
          { key: "visitTime", label: t("customers.detail.preferences.visitTime"), value: customer.visitTime },
          { key: "specialRequests", label: t("customers.detail.preferences.specialRequests"), value: customer.specialRequests },
        ]}
        onClose={() => setPreferencesEditOpen(false)}
        onSave={(values) => {
          run(
            customerActions.savePreferences(current.id, {
              cuisinePreference: values.cuisinePreference.split(",").map((s) => s.trim()).filter(Boolean),
              dietaryPreference: values.dietaryPreference,
              occasion: values.occasion,
              visitTime: values.visitTime,
              specialRequests: values.specialRequests,
            }),
            t("customers.detail.savedConfirm")
          );
        }}
      />
    </div>
  );
}

function StatTile({ label, value, tile }: { label: string; value: string; tile: StatTileStyle }) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-3 rounded-[12px] border-2 border-[#fefefe] px-1 py-2 text-center shadow-[0_4px_2.5px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border-[var(--octo-card)] ${tile.surface}`}>
      <div className={`grid h-8 w-8 place-items-center rounded-[4px] text-white ${tile.badge}`}>
        <ShellIcon name={tile.icon} size={24} />
      </div>
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="whitespace-nowrap text-[20px] font-semibold leading-[20px] text-[var(--octo-text-primary)]">{value}</div>
        <div className={`text-[14px] font-medium leading-[14px] text-[var(--octo-text-muted)] ${CLIP_SAFE}`}>{label}</div>
      </div>
    </div>
  );
}

/** Centres a glyph exported at its own bounds inside the frame's 24px icon slot. */
function IconSlot({ children }: { children: ReactNode }) {
  return <span className="grid h-6 w-6 shrink-0 place-items-center">{children}</span>;
}

// Local rather than the shared ActionButton: this row mixes icon sizes, gaps
// and paddings per button, which that component's fixed shape cannot express.
function DetailAction({ icon, label, onClick, className }: { icon: ReactNode; label: string; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-[8px] text-[14px] font-medium leading-[14px] transition-[filter] hover:brightness-[0.97] xl:flex-auto ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

function PanelIconButton({ label, icon, onClick, className }: { label: string; icon: ReactNode; onClick: () => void; className: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`grid h-6 w-6 shrink-0 place-items-center rounded-[4px] transition-opacity hover:opacity-70 ${className}`}>
      {icon}
    </button>
  );
}

function Panel({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  return (
    <section className={`flex flex-col gap-3 rounded-[16px] p-3 ${CARD_BORDER}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 font-medium">
      <dt className="shrink-0 text-[10px] leading-[10px] text-[var(--octo-text-secondary)]">{label}</dt>
      <dd className="min-w-0 text-end text-[12px] leading-[12px] text-[var(--octo-text-primary)]">{value}</dd>
    </div>
  );
}

function ListPanel({ title, viewAllTo, empty, children }: { title: string; viewAllTo: string; empty: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className={`flex flex-col gap-3 rounded-[16px] p-3 ${CARD_BORDER}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)]">{title}</h2>
        <Link to={viewAllTo} className={`shrink-0 text-[12px] font-medium leading-[12px] underline hover:opacity-80 ${LINK_COLOR}`}>
          {t("customers.detail.viewAll")}
        </Link>
      </div>
      {empty ? (
        <p className="text-[12px] font-medium text-[var(--octo-text-muted)]">{t("customers.detail.historyEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">{children}</ul>
      )}
    </section>
  );
}
