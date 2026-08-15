import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Search, X } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Input, Select, Modal, Button, EmptyState } from "@ui/primitives";
import {
  giftCardKpis,
  giftCardDesignSwatches,
  giftCards,
  type GiftCard,
  type GiftCardDesign,
  type GiftCardStatus,
} from "@/shared/api/mock-marketing";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const STATUS_TONE: Record<GiftCardStatus, "success" | "warning" | "neutral" | "error"> = {
  Active: "success",
  "Partially Used": "warning",
  "Fully Used": "neutral",
  Expired: "neutral",
  Void: "error",
};

function money(n: number): string {
  return `SAR ${n.toLocaleString("en-US")}`;
}

export function GiftCardsPage() {
  const { t } = useI18n();
  const [designFilter, setDesignFilter] = useState<"All" | GiftCardDesign>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | GiftCardStatus>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);

  const filtered = useMemo(() => {
    return giftCards.filter((gc) => {
      if (designFilter !== "All" && gc.design !== designFilter) return false;
      if (statusFilter !== "All" && gc.status !== statusFilter) return false;
      if (query && !gc.code.toLowerCase().includes(query.toLowerCase()) && !gc.id.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [designFilter, statusFilter, query]);

  const selected = giftCards.find((gc) => gc.id === selectedId) ?? null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("marketing.giftCards.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("marketing.giftCards.subtitle")}
          </p>
        </div>
        <Button icon={<Plus size={13} />} onClick={() => setIssueOpen(true)}>
          {t("marketing.giftCards.issue")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {giftCardKpis.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[200px] flex-1"
            icon={<Search size={13} />}
            placeholder={t("marketing.giftCards.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select className="w-[160px]" value={designFilter} onChange={(e) => setDesignFilter(e.target.value as typeof designFilter)}>
            <option value="All">{t("marketing.giftCards.filter.allDesigns")}</option>
            {giftCardDesignSwatches.map((d) => (
              <option key={d.id} value={d.id}>{t(labelKey(d.id))}</option>
            ))}
          </Select>
          <Select className="w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="All">{t("marketing.giftCards.filter.allStatuses")}</option>
            {(["Active", "Partially Used", "Fully Used", "Expired", "Void"] as GiftCardStatus[]).map((s) => (
              <option key={s} value={s}>{t(labelKey(s))}</option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<CreditCard size={18} />}
            title={t("marketing.giftCards.empty.title")}
            description={t("marketing.giftCards.empty.description")}
            action={
              <Button variant="secondary" onClick={() => { setDesignFilter("All"); setStatusFilter("All"); setQuery(""); }}>
                {t("marketing.giftCards.clearFilters")}
              </Button>
            }
          />
        ) : (
          <div className="octo-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  {[
                    "marketing.giftCards.col.code",
                    "marketing.giftCards.col.design",
                    "marketing.giftCards.col.initialValue",
                    "marketing.giftCards.col.balance",
                    "marketing.giftCards.col.purchaser",
                    "marketing.giftCards.col.recipient",
                    "marketing.giftCards.col.issued",
                    "marketing.giftCards.col.expiry",
                    "marketing.giftCards.col.status",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                      {t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((gc) => {
                  const pct = gc.initialValueSar === 0 ? 0 : Math.round((gc.balanceSar / gc.initialValueSar) * 100);
                  return (
                    <tr
                      key={gc.id}
                      className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                      onClick={() => setSelectedId(gc.id)}
                    >
                      <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{gc.code}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelKey(gc.design))}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{money(gc.initialValueSar)}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap text-[var(--octo-text-primary)]">{money(gc.balanceSar)} / {money(gc.initialValueSar)}</span>
                          <div className="h-1.5 w-[54px] shrink-0 overflow-hidden rounded-full bg-[var(--octo-track)]">
                            <div className="h-full rounded-full bg-[#0D6EFD]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{gc.purchaser}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{gc.recipient}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{gc.issued}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{gc.expiry}</td>
                      <td className="whitespace-nowrap px-2 py-2.5">
                        <Badge tone={STATUS_TONE[gc.status]}>{t(labelKey(gc.status))}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <GiftCardDrawer card={selected} onClose={() => setSelectedId(null)} />
      <IssueGiftCardModal open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  );
}

function GiftCardDrawer({ card, onClose }: { card: GiftCard | null; onClose: () => void }) {
  const { t } = useI18n();
  const open = Boolean(card);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const design = card ? giftCardDesignSwatches.find((d) => d.id === card.design) : undefined;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("marketing.giftCards.drawer.title")}
        className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[420px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        {card && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
              <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("marketing.giftCards.drawer.title")}</h2>
              <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]">
                <X size={15} />
              </button>
            </div>
            <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
              <div
                className="flex h-[110px] flex-col justify-between rounded-xl p-3 text-white"
                style={{ background: design?.gradient }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-90">{t(labelKey(card.design))}</span>
                <span className="text-[16px] font-bold tracking-wide">{card.code}</span>
              </div>

              <div className="mt-4 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.giftCards.col.status")}</span>
                <Badge tone={STATUS_TONE[card.status]}>{t(labelKey(card.status))}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.giftCards.col.balance")}</span>
                <span className="font-medium text-[var(--octo-text-primary)]">{money(card.balanceSar)} / {money(card.initialValueSar)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.giftCards.col.purchaser")}</span>
                <span className="text-[var(--octo-text-primary)]">{card.purchaser}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.giftCards.col.recipient")}</span>
                <span className="text-[var(--octo-text-primary)]">{card.recipient}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.giftCards.col.expiry")}</span>
                <span className="text-[var(--octo-text-primary)]">{card.expiry}</span>
              </div>

              <div className="mt-5">
                <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  {t("marketing.giftCards.drawer.history")}
                </h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {card.history.map((ev, i) => (
                    <li key={i} className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--octo-text-secondary)]">{ev.date} · {ev.label}</span>
                      {ev.amountSar !== undefined && (
                        <span className={`font-medium ${ev.amountSar < 0 ? "text-[#dc2626]" : "text-[#16a34a]"}`}>
                          {ev.amountSar < 0 ? "-" : "+"}{money(Math.abs(ev.amountSar))}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function IssueGiftCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [design, setDesign] = useState<GiftCardDesign>("Ocean");
  const [amount, setAmount] = useState(200);
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [delivery, setDelivery] = useState<"WhatsApp" | "Email" | "Print">("WhatsApp");

  function handleIssue() {
    onClose();
    setRecipientName("");
    setRecipientContact("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("marketing.giftCards.issueModal.title")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleIssue}>{t("marketing.giftCards.issueModal.confirm")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("marketing.giftCards.issueModal.design")}
          </span>
          <div className="mt-1.5 flex gap-2">
            {giftCardDesignSwatches.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-label={t(labelKey(d.id))}
                aria-pressed={design === d.id}
                onClick={() => setDesign(d.id)}
                className={`h-9 flex-1 rounded-[9px] transition-shadow ${design === d.id ? "ring-2 ring-offset-1 ring-[#0D6EFD]" : ""}`}
                style={{ background: d.gradient }}
              />
            ))}
          </div>
        </div>

        <Input
          label={t("marketing.giftCards.issueModal.amount")}
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <Input
          label={t("marketing.giftCards.issueModal.recipientName")}
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
        />
        <Input
          label={t("marketing.giftCards.issueModal.recipientContact")}
          value={recipientContact}
          onChange={(e) => setRecipientContact(e.target.value)}
        />
        <Select
          label={t("marketing.giftCards.issueModal.delivery")}
          value={delivery}
          onChange={(e) => setDelivery(e.target.value as typeof delivery)}
        >
          <option value="WhatsApp">{t(labelKey("WhatsApp"))}</option>
          <option value="Email">{t(labelKey("Email"))}</option>
          <option value="Print">{t("marketing.giftCards.issueModal.print")}</option>
        </Select>
      </div>
    </Modal>
  );
}
