import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, EmptyState, Input } from "@ui/primitives";
import { customerStats, customerRows } from "@/shared/api/mock-customers";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";
import { SEGMENT_TONE, SEGMENT_STYLE, LOYALTY_STYLE } from "./styles";

export function CustomersPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customerRows;
    return customerRows.filter(
      (row) => row.name.toLowerCase().includes(q) || row.phone.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("customers.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("customers.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {customerStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-[var(--octo-text-muted)]" />
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("customers.customerList")}</h2>
          </div>

          <div className="w-full max-w-[260px]">
            <Input
              placeholder={t("customers.searchPlaceholder")}
              icon={<Search size={13} />}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {["customers.col.customer", "customers.col.segment", "customers.col.visits", "customers.col.totalSpent", "customers.col.loyaltyTier", "customers.col.lastVisit"].map((key) => (
                  <th
                    key={key}
                    className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                  >
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/customers/${row.id}`)}
                  className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                >
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="font-semibold text-[var(--octo-text-primary)]">{row.name}</div>
                    <div className="text-[11px] text-[var(--octo-text-muted)]">{row.phone}</div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={SEGMENT_TONE[row.segment]} style={SEGMENT_STYLE[row.segment]}>
                      {t(labelKey(row.segment))}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.visits}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.totalSpent}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${LOYALTY_STYLE[row.loyaltyTier]}`}>
                      {t(labelKey(row.loyaltyTier))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{row.lastVisit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length === 0 && (
            <EmptyState
              icon={<Users size={18} />}
              title={t("customers.emptyTitle")}
              description={t("customers.noMatch").replace("{query}", query)}
              action={
                <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                  {t("customers.clearFilters")}
                </Button>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
