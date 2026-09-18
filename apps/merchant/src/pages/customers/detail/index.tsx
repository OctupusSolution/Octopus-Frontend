// apps/merchant/src/pages/customers/detail/index.tsx
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CalendarDays, CreditCard, Link2, Mail, MessageSquarePlus, Share, SquarePen, Tag, Trash2, Users, Utensils } from "lucide-react";
import { EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerStore, useCustomers } from "../_shared/customer-store";
import { customerName, formatDate, formatReservationDateTime, formatSar, formatSarWhole } from "../_shared/format";
import { Avatar } from "../_shared/avatar";
import { ActionButton } from "../_shared/action-button";
import { TagChips } from "../_shared/tag-chips";
import { Toast, useToast } from "../_shared/toast";
import { WhatsAppGlyph } from "../_shared/whatsapp-glyph";
import {
  ACTION_TINT, DETAIL_STAT_TILE_THEME, PAYMENT_STATUS_STYLE, RESERVATION_STATUS_STYLE, type DetailStatTileTheme,
} from "../_shared/theme";
import { PaymentLinkModal } from "../_shared/payment-link-modal";
import { AddNoteModal } from "../_shared/add-note-modal";
import { AddTagModal } from "../_shared/add-tag-modal";
import { EditInfoModal } from "../_shared/edit-info-modal";
import type { CustomerRecord } from "../_shared/types";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const customer = useCustomers().find((c) => c.id === id);
  const [toast, showToast] = useToast();
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
        className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <ArrowLeft size={20} className="rtl:rotate-180" />
      </button>
      <h1 className="text-[24px] font-bold leading-tight text-[var(--octo-text-primary)]">{t("customers.detail.title")}</h1>
    </div>
  );

  if (!customer) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-6">
        {heading}
        <EmptyState className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]" icon={<Users size={18} />} title={t("customers.detail.notFound")} />
      </div>
    );
  }

  const current = customer;
  function patch(updater: (c: CustomerRecord) => Partial<CustomerRecord>) {
    customerStore.updateCustomer(current.id, updater);
  }

  const name = customerName(customer);
  const localeTag = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="px-4 pb-10 pt-4 sm:px-[26px] sm:pt-6">
      {heading}

      <header className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 xl:flex-nowrap">
        <div className="flex min-w-[280px] items-center gap-4 xl:w-[380px] xl:shrink-0 xl:border-e xl:border-[var(--octo-divider)] xl:pe-4">
          <Avatar name={name} photo={customer.avatarUrl} size={96} />
          <div className="min-w-0">
            <div className="truncate text-[18px] font-medium text-[var(--octo-text-primary)]">{name}</div>
            <TagChips tags={customer.tags} blocked={customer.isBlocked} className="mt-1.5" />
            <div className="mt-2 flex items-center gap-1.5 text-[14px] text-[var(--octo-text-secondary)]">
              <WhatsAppGlyph size={13} /> <span dir="ltr">{customer.phone}</span>
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[14px] text-[var(--octo-text-secondary)]">
              <Mail size={13} className="shrink-0" /> <span className="truncate">{customer.email || "—"}</span>
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label={t("customers.detail.totalVisits")} value={String(customer.visits)} theme={DETAIL_STAT_TILE_THEME.totalVisits} />
          <StatTile label={t("customers.detail.totalSpend")} value={formatSarWhole(customer.totalSpendSar)} theme={DETAIL_STAT_TILE_THEME.totalSpend} />
          <StatTile label={t("customers.detail.lastVisit")} value={formatDate(customer.lastVisit, locale)} theme={DETAIL_STAT_TILE_THEME.lastVisit} />
          <StatTile
            label={t("customers.detail.loyaltyPoints")}
            value={t("customers.detail.pointsValue").replace("{points}", customer.loyaltyPoints.toLocaleString(localeTag))}
            theme={DETAIL_STAT_TILE_THEME.loyaltyPoints}
          />
          <StatTile label={t("customers.detail.avgSpend")} value={formatSarWhole(customer.avgSpendSar)} theme={DETAIL_STAT_TILE_THEME.avgSpend} />
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title={t("customers.detail.about.title")}
          action={<PanelIconButton label={t("customers.detail.editAbout.title")} onClick={() => setAboutEditOpen(true)} icon={<SquarePen size={22} strokeWidth={1.75} />} />}
        >
          <dl className="flex flex-col gap-2">
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
          action={<PanelIconButton label={t("customers.detail.editPreferences.title")} onClick={() => setPreferencesEditOpen(true)} icon={<SquarePen size={22} strokeWidth={1.75} />} />}
        >
          <dl className="flex flex-col gap-2">
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
          action={<PanelIconButton label={t("customers.addNote.title")} onClick={() => setNoteOpen(true)} icon={<MessageSquarePlus size={22} strokeWidth={1.75} />} />}
        >
          {customer.notes.length === 0 ? (
            <p className="text-[13px] text-[var(--octo-text-muted)]">{t("customers.detail.notes.empty")}</p>
          ) : (
            <ul className="flex list-disc flex-col gap-2.5 ps-6 text-[14px] text-[var(--octo-text-primary)] marker:text-[var(--octo-text-primary)]">
              {customer.notes.map((note, index) => (
                <li key={index}>
                  <span className="font-semibold">{formatDate(note.date, locale)}</span> - {note.text}
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
              <li key={index} className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2">
                <CalendarDays size={26} strokeWidth={1.5} className="shrink-0 text-[var(--octo-text-secondary)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] leading-snug text-[var(--octo-text-primary)]">{formatReservationDateTime(res.date, locale)}</div>
                  <div className="text-[13.5px] text-[var(--octo-text-secondary)]">{res.table} - {res.guests} {t("customers.detail.guests")}</div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px]" style={{ color: style.text, backgroundColor: style.bg }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.text }} />
                  {t(`customers.detail.reservationStatus.${res.status.toLowerCase()}`)}
                </span>
              </li>
            );
          })}
        </ListPanel>

        <ListPanel title={t("customers.detail.orders.title")} viewAllTo="/orders" empty={customer.recentOrders.length === 0}>
          {customer.recentOrders.map((order) => (
            <li key={order.id} className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2">
              <Utensils size={26} strokeWidth={1.5} className="shrink-0 text-[var(--octo-text-secondary)]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] text-[var(--octo-text-primary)]">{formatDate(order.date, locale)} - {order.id}</div>
                <div className="truncate text-[13.5px] text-[var(--octo-text-secondary)]">{order.items}</div>
                <div className="text-[16px] font-semibold text-[#0D6EFD]">{formatSar(order.totalSar)}</div>
              </div>
            </li>
          ))}
        </ListPanel>

        <ListPanel title={t("customers.detail.payments.title")} viewAllTo="/finance/payments" empty={customer.recentPayments.length === 0}>
          {customer.recentPayments.map((payment, index) => {
            const style = PAYMENT_STATUS_STYLE[payment.status];
            return (
              <li key={index} className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2">
                <CreditCard size={26} strokeWidth={1.5} className="shrink-0 text-[var(--octo-text-secondary)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-[var(--octo-text-secondary)]">{formatDate(payment.date, locale)}</div>
                  <div className="text-[14px] text-[var(--octo-text-primary)]" dir="ltr">**** **** **** {payment.cardLast4}</div>
                  <div className="text-[16px] font-semibold text-[#0D6EFD]">{formatSar(payment.amountSar)}</div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[13px]" style={{ color: style.text, backgroundColor: style.bg }}>
                  {t(`customers.detail.${payment.status.toLowerCase()}`)}
                </span>
              </li>
            );
          })}
        </ListPanel>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:flex xl:justify-between">
        <ActionButton size="md" className="xl:flex-1" icon={<CalendarDays size={18} />} label={t("customers.row.newReservations")} tint={ACTION_TINT.newReservations} onClick={() => navigate("/reservations/new")} />
        <ActionButton size="md" className="xl:flex-1" icon={<Link2 size={18} />} label={t("customers.row.paymentLink")} tint={ACTION_TINT.paymentLink} onClick={() => setPaymentLinkOpen(true)} />
        <ActionButton size="md" className="xl:flex-1" icon={<WhatsAppGlyph size={20} />} label={t("customers.rowAction.sendWhatsapp")} tint={ACTION_TINT.whatsapp} onClick={() => showToast(t("customers.rowAction.whatsappSent"))} />
        <ActionButton size="md" className="xl:flex-1" icon={<Share size={19} />} label={t("customers.rowAction.sendEmail")} tint={ACTION_TINT.email} onClick={() => showToast(t("customers.rowAction.emailSent"))} />
        <ActionButton size="md" className="xl:flex-1" icon={<Tag size={19} />} label={t("customers.rowAction.addTag")} onClick={() => setTagOpen(true)} />
        <ActionButton
          size="md"
          className="xl:flex-1"
          icon={<Ban size={19} />}
          label={t(customer.isBlocked ? "customers.rowAction.unblock" : "customers.rowAction.block")}
          onClick={() => {
            patch((c) => ({ isBlocked: !c.isBlocked }));
            showToast(t(customer.isBlocked ? "customers.rowAction.unblocked" : "customers.rowAction.blocked"));
          }}
        />
        <ActionButton
          size="md"
          className="xl:flex-1"
          icon={<Trash2 size={19} />}
          label={t("customers.rowAction.delete")}
          tint={ACTION_TINT.danger}
          onClick={() => {
            if (!window.confirm(t("customers.rowAction.deleteConfirm"))) return;
            customerStore.setCustomers((prev) => prev.filter((c) => c.id !== current.id));
            navigate("/customers");
          }}
        />
      </div>

      <Toast message={toast} />
      <PaymentLinkModal customer={paymentLinkOpen ? customer : null} onClose={() => setPaymentLinkOpen(false)} onSent={() => showToast(t("customers.paymentLink.sentConfirm"))} />
      <AddNoteModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        onSave={(text) => {
          patch((c) => ({ notes: [...c.notes, { date: new Date().toISOString().slice(0, 10), text }] }));
          showToast(t("customers.addNote.savedConfirm"));
        }}
      />
      <AddTagModal
        open={tagOpen}
        onClose={() => setTagOpen(false)}
        onSave={(tag) => {
          patch((c) => ({ tags: c.tags.includes(tag) ? c.tags : [...c.tags, tag] }));
          showToast(t("customers.addTag.savedConfirm").replace("{tag}", tag));
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
          patch(() => ({
            preferredBranch: values.preferredBranch,
            preferredAreaTable: values.preferredAreaTable,
            referredBy: values.referredBy.trim() || undefined,
          }));
          showToast(t("customers.detail.savedConfirm"));
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
          patch(() => ({
            cuisinePreference: values.cuisinePreference.split(",").map((s) => s.trim()).filter(Boolean),
            dietaryPreference: values.dietaryPreference,
            occasion: values.occasion,
            visitTime: values.visitTime,
            specialRequests: values.specialRequests,
          }));
          showToast(t("customers.detail.savedConfirm"));
        }}
      />
    </div>
  );
}

function StatTile({ label, value, theme }: { label: string; value: string; theme: DetailStatTileTheme }) {
  const Icon = theme.icon;
  return (
    <div className={`flex min-w-0 flex-col items-center rounded-xl px-2 py-3 text-center ${theme.cardBg}`}>
      <div className="grid h-10 w-10 place-items-center rounded-[8px]" style={{ backgroundColor: theme.tile }}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="mt-3 w-full truncate text-[20px] font-medium leading-tight text-[var(--octo-text-primary)]">{value}</div>
      <div className="mt-1 w-full truncate text-[15px] text-[var(--octo-text-muted)]">{label}</div>
    </div>
  );
}

function PanelIconButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid h-8 w-8 place-items-center rounded-md text-[#3B82F6] transition-colors hover:bg-[var(--octo-hover)]">
      {icon}
    </button>
  );
}

function Panel({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-[12.5px] text-[var(--octo-text-secondary)]">{label}</dt>
      <dd className="min-w-0 text-end text-[15px] text-[var(--octo-text-primary)]">{value}</dd>
    </div>
  );
}

function ListPanel({ title, viewAllTo, empty, children }: { title: string; viewAllTo: string; empty: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">{title}</h2>
        <Link to={viewAllTo} className="text-[15px] text-[#3B82F6] underline underline-offset-2 hover:opacity-80">
          {t("customers.detail.viewAll")}
        </Link>
      </div>
      {empty ? (
        <p className="mt-3 text-[13px] text-[var(--octo-text-muted)]">{t("customers.detail.historyEmpty")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">{children}</ul>
      )}
    </section>
  );
}
