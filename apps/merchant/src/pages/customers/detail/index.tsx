// apps/merchant/src/pages/customers/detail/index.tsx
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coins, Pencil, Plus, Users } from "lucide-react";
import { Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerRecords } from "../_shared/mock-data";
import { customerName, formatDate, formatReservationDateTime } from "../_shared/format";
import { Avatar } from "../_shared/avatar";
import { TAG_STYLE, DEFAULT_TAG_STYLE, BLOCKED_STYLE, TAG_LABEL_KEY } from "../_shared/theme";
import { PaymentLinkModal } from "../_shared/payment-link-modal";
import { AddNoteModal } from "../_shared/add-note-modal";
import { AddTagModal } from "../_shared/add-tag-modal";
import { EditInfoModal } from "../_shared/edit-info-modal";
import type { CustomerRecord, CustomerTag } from "../_shared/types";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [customer, setCustomer] = useState<CustomerRecord | undefined>(() => customerRecords.find((c) => c.id === id));
  const [toast, setToast] = useState<string | null>(null);
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [aboutEditOpen, setAboutEditOpen] = useState(false);
  const [preferencesEditOpen, setPreferencesEditOpen] = useState(false);

  const back = (
    <Button variant="ghost" size="sm" icon={<ArrowLeft size={13} className="rtl:rotate-180" />} onClick={() => navigate("/customers")}>
      {t("customers.detail.back")}
    </Button>
  );

  if (!customer) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        {back}
        <EmptyState className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]" icon={<Users size={18} />} title={t("customers.detail.notFound")} />
      </div>
    );
  }

  function patch(updater: (c: CustomerRecord) => Partial<CustomerRecord>) {
    setCustomer((prev) => (prev ? { ...prev, ...updater(prev) } : prev));
  }

  const name = customerName(customer);
  const localeTag = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="px-4 pb-24 pt-4 sm:px-[26px] sm:pt-5">
      {back}

      <header className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <Avatar name={name} size={56} />
        <div>
          <h1 className="text-[17px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[19px]">{name}</h1>
          <div className="mt-1 flex flex-wrap gap-1">
            {customer.isBlocked && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: BLOCKED_STYLE.text, backgroundColor: BLOCKED_STYLE.bg }}>
                {t("customers.tag.blocked")}
              </span>
            )}
            {customer.tags.map((tag) => {
              const style = TAG_STYLE[tag as CustomerTag] ?? DEFAULT_TAG_STYLE;
              const labelKey = TAG_LABEL_KEY[tag as CustomerTag];
              return (
                <span key={tag} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: style.text, backgroundColor: style.bg }}>
                  {labelKey ? t(labelKey) : tag}
                </span>
              );
            })}
          </div>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{customer.phone} · {customer.email}</p>
        </div>
      </header>

      {toast && <div className="mt-3 rounded-[9px] bg-[#22C55E]/10 px-3 py-2 text-[11.5px] font-medium text-[#16a34a]">{toast}</div>}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label={t("customers.detail.totalVisits")} value={String(customer.visits)} />
        <StatTile label={t("customers.detail.totalSpend")} value={`SAR ${customer.totalSpendSar}`} />
        <StatTile label={t("customers.detail.lastVisit")} value={formatDate(customer.lastVisit, locale)} />
        <StatTile label={t("customers.detail.loyaltyPoints")} value={`${customer.loyaltyPoints.toLocaleString(localeTag)} pts`} icon={<Coins size={14} className="text-[#F59E0B]" />} />
        <StatTile label={t("customers.detail.avgSpend")} value={`SAR ${customer.avgSpendSar}`} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel title={t("customers.detail.about.title")} onEdit={() => setAboutEditOpen(true)}>
          <InfoRow label={t("customers.detail.about.customerSince")} value={formatDate(customer.customerSince, locale)} />
          <InfoRow label={t("customers.detail.about.firstVisit")} value={formatDate(customer.firstVisit, locale)} />
          <InfoRow label={t("customers.detail.about.preferredBranch")} value={customer.preferredBranch || "—"} />
          <InfoRow label={t("customers.detail.about.preferredAreaTable")} value={customer.preferredAreaTable || "—"} />
          {customer.vipSince && <InfoRow label={t("customers.detail.about.vipSince")} value={formatDate(customer.vipSince, locale)} />}
          <InfoRow label={t("customers.detail.about.referredBy")} value={customer.referredBy ?? "—"} />
          <InfoRow label={t("customers.detail.about.marketingConsent")} value={t(customer.marketingConsent === "Opted in" ? "customers.marketingConsent.optedIn" : "customers.marketingConsent.optedOut")} />
        </Panel>

        <Panel title={t("customers.detail.preferences.title")} onEdit={() => setPreferencesEditOpen(true)}>
          <InfoRow label={t("customers.detail.preferences.cuisine")} value={customer.cuisinePreference.join(", ") || "—"} />
          <InfoRow label={t("customers.detail.preferences.dietary")} value={customer.dietaryPreference || "—"} />
          <InfoRow label={t("customers.detail.preferences.occasion")} value={customer.occasion || "—"} />
          <InfoRow label={t("customers.detail.preferences.visitTime")} value={customer.visitTime || "—"} />
          <InfoRow label={t("customers.detail.preferences.communication")} value={customer.communicationPreference.join(", ") || "—"} />
          <InfoRow label={t("customers.detail.preferences.specialRequests")} value={customer.specialRequests || "—"} />
        </Panel>

        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.detail.notes.title")}</h2>
            <button type="button" onClick={() => setNoteOpen(true)} className="grid h-6 w-6 place-items-center rounded-md text-[#0D6EFD] transition-colors hover:bg-[var(--octo-hover)]" aria-label="Add note">
              <Plus size={14} />
            </button>
          </div>
          {customer.notes.length === 0 ? (
            <p className="mt-2.5 text-[12px] text-[var(--octo-text-muted)]">{t("customers.detail.notes.empty")}</p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-2">
              {customer.notes.map((note, index) => (
                <li key={index} className="text-[12px] text-[var(--octo-text-secondary)]">
                  <span className="font-semibold text-[var(--octo-text-primary)]">{formatDate(note.date, locale)}</span> - {note.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ListPanel title={t("customers.detail.reservations.title")}>
          {customer.recentReservations.map((res, index) => (
            <li key={index} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2 text-[12px]">
              <span>{formatReservationDateTime(res.date, locale)}<br /><span className="text-[var(--octo-text-muted)]">{res.table} - {res.guests} {t("customers.detail.guests")}</span></span>
              <span className="rounded-full bg-[#FDF3D6] px-2 py-0.5 text-[11px] font-medium text-[#B9860A]">{t(`customers.detail.reservationStatus.${res.status.toLowerCase()}`)}</span>
            </li>
          ))}
        </ListPanel>

        <ListPanel title={t("customers.detail.orders.title")}>
          {customer.recentOrders.map((order) => (
            <li key={order.id} className="rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2 text-[12px]">
              <div className="text-[var(--octo-text-muted)]">{formatDate(order.date, locale)} - {order.id}</div>
              <div className="mt-0.5">{order.items}</div>
              <div className="mt-0.5 font-semibold text-[#0D6EFD]">SAR {order.totalSar.toFixed(2)}</div>
            </li>
          ))}
        </ListPanel>

        <ListPanel title={t("customers.detail.payments.title")}>
          {customer.recentPayments.map((payment, index) => (
            <li key={index} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2 text-[12px]">
              <span>{formatDate(payment.date, locale)}<br /><span className="text-[var(--octo-text-muted)]">**** **** **** {payment.cardLast4}</span></span>
              <span className="text-end">
                <span className="block rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-medium text-[#16A34A]">{t(`customers.detail.${payment.status.toLowerCase()}`)}</span>
                <span className="mt-1 block font-semibold text-[#0D6EFD]">SAR {payment.amountSar.toFixed(2)}</span>
              </span>
            </li>
          ))}
        </ListPanel>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <Button variant="secondary" size="sm">{t("customers.row.newReservations")}</Button>
        <Button variant="secondary" size="sm" onClick={() => setPaymentLinkOpen(true)}>{t("customers.row.paymentLink")}</Button>
        <Button variant="secondary" size="sm" onClick={() => setToast(t("customers.rowAction.whatsappSent"))}>{t("customers.rowAction.sendWhatsapp")}</Button>
        <Button variant="secondary" size="sm" onClick={() => setToast(t("customers.rowAction.emailSent"))}>{t("customers.rowAction.sendEmail")}</Button>
        <Button variant="secondary" size="sm" onClick={() => setTagOpen(true)}>{t("customers.rowAction.addTag")}</Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { patch((c) => ({ isBlocked: !c.isBlocked })); setToast(t(customer.isBlocked ? "customers.rowAction.unblocked" : "customers.rowAction.blocked")); }}
        >
          {t(customer.isBlocked ? "customers.rowAction.unblock" : "customers.rowAction.block")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => { if (window.confirm(t("customers.rowAction.deleteConfirm"))) navigate("/customers"); }}
        >
          {t("customers.rowAction.delete")}
        </Button>
      </div>

      <PaymentLinkModal customer={paymentLinkOpen ? customer : null} onClose={() => setPaymentLinkOpen(false)} onSent={() => setToast(t("customers.paymentLink.sentConfirm"))} />
      <AddNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} onSave={(text) => patch((c) => ({ notes: [...c.notes, { date: new Date().toISOString().slice(0, 10), text }] }))} />
      <AddTagModal open={tagOpen} onClose={() => setTagOpen(false)} onSave={(tag) => patch((c) => ({ tags: c.tags.includes(tag) ? c.tags : [...c.tags, tag] }))} />
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
        onSave={(values) =>
          patch(() => ({
            preferredBranch: values.preferredBranch,
            preferredAreaTable: values.preferredAreaTable,
            referredBy: values.referredBy.trim() || undefined,
          }))
        }
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
        onSave={(values) =>
          patch(() => ({
            cuisinePreference: values.cuisinePreference.split(",").map((s) => s.trim()).filter(Boolean),
            dietaryPreference: values.dietaryPreference,
            occasion: values.occasion,
            visitTime: values.visitTime,
            specialRequests: values.specialRequests,
          }))
        }
      />
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[14px] py-[12px]">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[17px] font-bold text-[var(--octo-text-primary)]">{icon}{value}</div>
    </div>
  );
}

function Panel({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{title}</h2>
        <button type="button" onClick={onEdit} className="grid h-6 w-6 place-items-center rounded-md text-[#0D6EFD] transition-colors hover:bg-[var(--octo-hover)]" aria-label={`Edit ${title}`}>
          <Pencil size={13} />
        </button>
      </div>
      <div className="mt-2.5 flex flex-col gap-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[var(--octo-text-muted)]">{label}</span>
      <span className="font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

function ListPanel({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{title}</h2>
        {/* Inert — no dedicated history route exists yet, so this doesn't act as a link. */}
        <button
          type="button"
          title={t("customers.detail.viewAll")}
          aria-disabled="true"
          className="cursor-default text-[11.5px] font-medium text-[var(--octo-text-faint)]"
        >
          {t("customers.detail.viewAll")}
        </button>
      </div>
      <ul className="mt-2.5 flex flex-col gap-2">{children}</ul>
    </section>
  );
}
