// apps/merchant/src/pages/customers/index.tsx
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerRecords } from "./_shared/mock-data";
import { customerName } from "./_shared/format";
import { CustomerStatCards } from "./_shared/stat-cards";
import { CustomerRow } from "./_shared/customer-row";
import type { CustomerRecord } from "./_shared/types";

export function CustomersPage() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => [...customerRecords]);
  const [search, setSearch] = useState("");

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) => customerName(c).toLowerCase().includes(query) || c.phone.includes(query) || c.email.toLowerCase().includes(query)
    );
  }, [customers, search]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">{t("customers.title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("customers.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">{t("customers.sendMessageCta")}</Button>
          <Button variant="primary" size="sm">{t("customers.addCustomer.cta")}</Button>
        </div>
      </header>

      <div className="mt-4">
        <CustomerStatCards />
      </div>

      {customers.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Users size={18} />}
          title={t("customers.empty.title")}
          description={t("customers.empty.description")}
          action={<Button variant="primary">{t("customers.empty.cta")}</Button>}
        />
      ) : (
        <>
          <div className="mt-4 max-w-[320px]">
            <div className="relative flex items-center">
              <Search size={13} className="pointer-events-none absolute start-3 text-[var(--octo-text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("customers.searchPlaceholder")}
                className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-2 ps-8 pe-3 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
              />
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={<Users size={18} />}
              title={t("customers.noMatch.title")}
              action={<Button variant="secondary" size="sm" onClick={() => setSearch("")}>{t("customers.noMatch.cta")}</Button>}
            />
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {visibleRows.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  selected={false}
                  onToggleSelect={() => {}}
                  onEdit={() => {}}
                  onNewReservation={() => {}}
                  onOpenPaymentLink={() => {}}
                  onOpenRowActions={() => {}}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
