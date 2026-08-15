import { useState } from "react";
import { AlertTriangle, Building2, RefreshCw, Wallet } from "lucide-react";
import { Badge, Button, Select } from "@ui/primitives";
import {
  accountingProviders,
  accountMappingRows,
  ledgerAccountOptions,
  unmappedCategoryCount,
  syncLogRows,
  formatSAR,
  type AccountingProvider,
  type AccountingConnectionStatus,
  type AccountMappingRow,
  type SyncLogRow,
  type SyncLogStatus,
} from "@/shared/api/mock-finance";
import { useI18n } from "@/app/providers/i18n-provider";

const CONNECTION_TONE: Record<AccountingConnectionStatus, "success" | "error" | "neutral"> = {
  Connected: "success",
  Error: "error",
  "Not Connected": "neutral",
};

const CONNECTION_KEY: Record<AccountingConnectionStatus, string> = {
  Connected: "finance.accounting.status.connected",
  Error: "finance.accounting.status.error",
  "Not Connected": "finance.accounting.status.notConnected",
};

const SYNC_TONE: Record<SyncLogStatus, "success" | "info" | "error"> = {
  Synced: "success",
  Pending: "info",
  Failed: "error",
};

const SYNC_KEY: Record<SyncLogStatus, string> = {
  Synced: "finance.accounting.syncStatus.synced",
  Pending: "finance.accounting.syncStatus.pending",
  Failed: "finance.accounting.syncStatus.failed",
};

const TYPE_KEY: Record<string, string> = {
  "Sales Journal": "finance.accounting.syncType.salesJournal",
  Payment: "finance.accounting.syncType.payment",
  Refund: "finance.accounting.syncType.refund",
  VAT: "finance.accounting.syncType.vat",
};

const PROVIDER_ICON_BG: Record<string, string> = { Qoyod: "#0D6EFD", Wafeq: "#6C4DFF", Daftra: "#F59E0B" };

function ProviderCard({ provider, onSync }: { provider: AccountingProvider; onSync: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-bold text-white"
          style={{ backgroundColor: PROVIDER_ICON_BG[provider.name] }}
        >
          {provider.name[0]}
        </span>
        <div>
          <div className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{provider.name}</div>
          <Badge tone={CONNECTION_TONE[provider.status]}>{t(CONNECTION_KEY[provider.status])}</Badge>
        </div>
      </div>

      {provider.status === "Error" && provider.errorMessage && (
        <div className="flex items-start gap-1.5 rounded-[9px] bg-[#fdecec] px-2.5 py-2 text-[11px] text-[#dc2626]">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {provider.errorMessage}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2 text-[11.5px]">
        <div>
          <dt className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("finance.accounting.lastSync")}</dt>
          <dd className="mt-0.5 font-medium text-[var(--octo-text-primary)]">{provider.lastSync}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("finance.accounting.entriesToday")}</dt>
          <dd className="mt-0.5 font-medium text-[var(--octo-text-primary)]">{provider.entriesToday.toLocaleString()}</dd>
        </div>
      </dl>

      <Button
        variant="secondary"
        size="sm"
        icon={<RefreshCw size={13} />}
        disabled={provider.status === "Not Connected"}
        onClick={() => onSync(provider.id)}
      >
        {t("finance.accounting.syncNow")}
      </Button>
    </article>
  );
}

export function AccountingPage() {
  const { t } = useI18n();
  const [providers, setProviders] = useState<AccountingProvider[]>(() => accountingProviders.map((p) => ({ ...p })));
  const [mapping, setMapping] = useState<AccountMappingRow[]>(() => accountMappingRows.map((r) => ({ ...r })));
  const [dirty, setDirty] = useState(false);
  const [syncLog, setSyncLog] = useState<SyncLogRow[]>(() => syncLogRows.map((r) => ({ ...r })));
  const [toast, setToast] = useState<string | null>(null);

  const unmappedCount = mapping.filter((r) => r.status === "Unmapped").length;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const syncProvider = (id: string) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, lastSync: "just now", entriesToday: p.entriesToday + Math.floor(1 + Math.random() * 3) } : p)));
    const provider = providers.find((p) => p.id === id);
    if (provider) showToast(t("finance.accounting.syncToast").replace("{provider}", provider.name));
  };

  const setLedgerAccount = (id: string, ledgerAccount: string) => {
    setMapping((prev) => prev.map((r) => (r.id === id ? { ...r, ledgerAccount, status: "Mapped" } : r)));
    setDirty(true);
  };

  const saveMapping = () => {
    setDirty(false);
    showToast(t("finance.accounting.mappingSaved"));
  };

  const discardMapping = () => {
    setMapping(accountMappingRows.map((r) => ({ ...r })));
    setDirty(false);
  };

  const retrySync = (id: string) => {
    setSyncLog((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Synced", message: "Posted to ledger." } : r)));
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("finance.accounting.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("finance.accounting.subtitle")}
          </p>
        </div>
      </header>

      {toast && (
        <div className="mt-3 rounded-[9px] bg-[#eafbe9] px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">
          {toast}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} onSync={syncProvider} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("finance.accounting.mappingTitle")}</h2>
        </div>

        {unmappedCount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-[9px] border border-[#fbe4c2] bg-[#fef3e8] px-3 py-2 text-[11.5px] font-medium text-[#c2660a]">
            <AlertTriangle size={14} />
            {t("finance.accounting.unmappedBanner").replace("{n}", String(unmappedCount))}
          </div>
        )}

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.category")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.ledgerAccount")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.taxCode")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {mapping.map((row) => (
                <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.category}</td>
                  <td className="px-2 py-2.5">
                    <Select
                      className="w-[220px]"
                      value={row.ledgerAccount ?? ""}
                      onChange={(e) => setLedgerAccount(row.id, e.target.value)}
                    >
                      <option value="" disabled>{t("finance.accounting.selectLedger")}</option>
                      {ledgerAccountOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.ledgerAccount ? "VAT-15" : "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={row.status === "Mapped" ? "success" : "warning"}>
                      {t(row.status === "Mapped" ? "finance.accounting.mapped" : "finance.accounting.unmapped")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dirty && (
          <div className="mt-3 flex items-center gap-3 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-hover)] px-3 py-2.5">
            <span className="text-[12px] text-[var(--octo-text-secondary)]">{t("finance.accounting.unsavedChanges")}</span>
            <div className="ms-auto flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={discardMapping}>{t("common.cancel")}</Button>
              <Button size="sm" onClick={saveMapping}>{t("common.save")}</Button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Wallet size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("finance.accounting.syncLogTitle")}</h2>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.timestamp")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.type")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.reference")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.amount")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.status")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.accounting.col.message")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" />
              </tr>
            </thead>
            <tbody>
              {syncLog.map((row) => (
                <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{row.timestamp}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(TYPE_KEY[row.type])}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.reference}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.amount)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={SYNC_TONE[row.status]}>{t(SYNC_KEY[row.status])}</Badge>
                  </td>
                  <td className={`px-2 py-2.5 ${row.status === "Failed" ? "text-[#dc2626]" : "text-[var(--octo-text-muted)]"}`}>{row.message}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {row.status === "Failed" && (
                      <Button variant="secondary" size="sm" icon={<RefreshCw size={12} />} onClick={() => retrySync(row.id)}>
                        {t("finance.accounting.retry")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
