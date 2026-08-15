import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coins, MessageCircle, StickyNote, Users } from "lucide-react";
import { Badge, Button, EmptyState } from "@ui/primitives";
import { customerRows } from "@/shared/api/mock-customers";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";
import { SEGMENT_TONE, SEGMENT_STYLE, LOYALTY_STYLE, initials } from "../styles";

function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(n);
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const customer = customerRows.find((c) => c.id === id);

  const back = (
    <Button
      variant="ghost"
      size="sm"
      icon={<ArrowLeft size={13} className="rtl:rotate-180" />}
      onClick={() => navigate("/customers")}
    >
      {t("customers.detail.back")}
    </Button>
  );

  if (!customer) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        {back}
        <EmptyState
          className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]"
          icon={<Users size={18} />}
          title={t("customers.detail.notFound")}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      {back}

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-info/10 text-[16px] font-semibold text-[#0D6EFD]">
            {initials(customer.name)}
          </div>
          <div>
            <h1 className="text-[17px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[19px]">{customer.name}</h1>
            <p className="mt-0.5 text-[12px] text-[var(--octo-text-muted)]">{customer.phone} · {customer.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={SEGMENT_TONE[customer.segment]} style={SEGMENT_STYLE[customer.segment]}>
                {t(labelKey(customer.segment))}
              </Badge>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${LOYALTY_STYLE[customer.loyaltyTier]}`}>
                {t(labelKey(customer.loyaltyTier))}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<MessageCircle size={13} />}
            onClick={() => setConfirmation(t("customers.drawer.whatsappSent"))}
          >
            {t("customers.drawer.sendWhatsapp")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<StickyNote size={13} />}
            onClick={() => setConfirmation(t("customers.drawer.noteAdded"))}
          >
            {t("customers.drawer.addNote")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Coins size={13} />}
            onClick={() => setConfirmation(t("customers.drawer.pointsAdjusted"))}
          >
            {t("customers.drawer.adjustPoints")}
          </Button>
        </div>
      </header>

      {confirmation && (
        <div className="mt-3 rounded-[9px] bg-[#22C55E]/10 px-3 py-2 text-[11.5px] font-medium text-[#16a34a]">
          {confirmation}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("customers.drawer.visits")} value={String(customer.visits)} />
        <StatTile label={t("customers.drawer.totalSpent")} value={customer.totalSpent} />
        <StatTile label={t("customers.drawer.avgBasket")} value={customer.avgBasket} />
        <StatTile label={t("customers.drawer.lastVisit")} value={customer.lastVisit} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title={t("customers.drawer.visitTimeline")}>
          {customer.visitHistory.length === 0 ? (
            <p className="text-[12px] text-[var(--octo-text-muted)]">{t("customers.drawer.noVisits")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {customer.visitHistory.slice(0, 10).map((visit) => (
                <li key={visit.orderId} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2">
                  <div>
                    <div className="text-[12px] font-medium text-[var(--octo-text-primary)]">{visit.orderId}</div>
                    <div className="text-[11px] text-[var(--octo-text-muted)]">{visit.branch} · {visit.date}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-[12px] font-semibold text-[var(--octo-text-primary)]">{visit.total}</div>
                    <div className="text-[11px] text-[var(--octo-text-faint)]">{visit.items} {t("customers.drawer.items")}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel title={t("customers.drawer.loyaltyPoints")}>
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--octo-text-primary)]">
              <Coins size={15} className="text-[#F59E0B]" />
              {formatNumber(customer.loyaltyPoints, locale)}
            </div>
          </Panel>

          <Panel title={t("customers.drawer.favouriteItems")}>
            {customer.favouriteItems.length === 0 ? (
              <p className="text-[12px] text-[var(--octo-text-muted)]">{t("customers.drawer.noFavourites")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {customer.favouriteItems.map((item) => (
                  <span key={item} className="rounded-full bg-[var(--octo-track)] px-2 py-1 text-[11px] font-medium text-[var(--octo-text-secondary)]">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t("customers.drawer.savedPayments")}>
            {customer.savedPaymentMethods.length === 0 ? (
              <p className="text-[12px] text-[var(--octo-text-muted)]">{t("customers.drawer.noPayments")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {customer.savedPaymentMethods.map((pm) => (
                  <li key={pm.method + pm.masked} className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--octo-text-primary)]">{t(labelKey(pm.method))}</span>
                    <span className="text-[var(--octo-text-muted)]">{pm.masked}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("customers.drawer.notes")}>
            <p className="text-[12px] text-[var(--octo-text-secondary)]">{customer.notes || t("customers.drawer.noNotes")}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</div>
      <div className="mt-1.5 text-[20px] font-bold text-[var(--octo-text-primary)]">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}
