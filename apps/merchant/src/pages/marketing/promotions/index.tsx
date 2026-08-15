import { useMemo, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Input, Select, Modal, Button, EmptyState, Checkbox } from "@ui/primitives";
import {
  promotionKpis,
  promotions,
  promoTodayIso,
  type Promotion,
  type PromoType,
  type PromoStatus,
  type PromoChannel,
} from "@/shared/api/mock-marketing";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const STATUS_TONE: Record<PromoStatus, "success" | "info" | "neutral"> = {
  Active: "success",
  Scheduled: "info",
  Expired: "neutral",
};

const ALL_CHANNELS: PromoChannel[] = ["Dine-in", "Delivery", "Kiosk", "Aggregators"];
const ALL_TYPES: PromoType[] = ["Percentage", "Fixed Amount", "BOGO", "Free Delivery", "Free Item"];
const CONDITION_OPTIONS = ["Min order SAR", "First order only", "Specific channel"];

function daysUntil(dateISO: string): number {
  return Math.round((new Date(dateISO).getTime() - new Date(promoTodayIso).getTime()) / 86400000);
}

export function PromotionsPage() {
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState<"All" | PromoType>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | PromoStatus>("All");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    return promotions.filter((p) => {
      if (typeFilter !== "All" && p.type !== typeFilter) return false;
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (query && !p.code.toLowerCase().includes(query.toLowerCase()) && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [typeFilter, statusFilter, query]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("marketing.promotions.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("marketing.promotions.subtitle")}
          </p>
        </div>
        <Button icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>
          {t("marketing.promotions.create")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {promotionKpis.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Input className="min-w-[200px] flex-1" placeholder={t("marketing.promotions.searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select className="w-[170px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="All">{t("marketing.promotions.filter.allTypes")}</option>
            {ALL_TYPES.map((ty) => (
              <option key={ty} value={ty}>{t(labelKey(ty))}</option>
            ))}
          </Select>
          <Select className="w-[150px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="All">{t("marketing.promotions.filter.allStatuses")}</option>
            {(["Active", "Scheduled", "Expired"] as PromoStatus[]).map((s) => (
              <option key={s} value={s}>{t(labelKey(s))}</option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Tag size={18} />}
            title={t("marketing.promotions.empty.title")}
            description={t("marketing.promotions.empty.description")}
            action={<Button variant="secondary" onClick={() => { setTypeFilter("All"); setStatusFilter("All"); setQuery(""); }}>{t("marketing.giftCards.clearFilters")}</Button>}
          />
        ) : (
          <div className="octo-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  {["marketing.promotions.col.code", "marketing.promotions.col.name", "marketing.promotions.col.type", "marketing.promotions.col.value", "marketing.promotions.col.conditions", "marketing.promotions.col.channels", "marketing.promotions.col.usage", "marketing.promotions.col.period", "marketing.promotions.col.status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const pct = Math.min(100, Math.round((p.used / p.cap) * 100));
                  const muted = p.status === "Expired";
                  return (
                    <tr key={p.id} className={`border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)] ${muted ? "opacity-50" : ""}`}>
                      <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{p.code}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{p.name}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelKey(p.type))}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{p.value}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {p.conditions.map((c) => (
                            <span key={c} className="whitespace-nowrap rounded-full bg-[var(--octo-track)] px-2 py-0.5 text-[10.5px] text-[var(--octo-text-secondary)]">{c}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {p.channels.map((c) => (
                            <span key={c} className="whitespace-nowrap rounded-full bg-[#eaf2ff] px-2 py-0.5 text-[10.5px] text-[#0D6EFD]">{t(labelKey(c))}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap text-[var(--octo-text-primary)]">{p.used.toLocaleString()}/{p.cap.toLocaleString()}</span>
                          <div className="h-1.5 w-[54px] shrink-0 overflow-hidden rounded-full bg-[var(--octo-track)]">
                            <div className="h-full rounded-full bg-[#0D6EFD]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{p.startDate} – {p.endDate}</td>
                      <td className="whitespace-nowrap px-2 py-2.5">
                        <Badge tone={STATUS_TONE[p.status]}>{t(labelKey(p.status))}</Badge>
                        {p.status === "Scheduled" && (
                          <div className="mt-1 text-[10.5px] text-[var(--octo-text-muted)]">
                            {t("marketing.promotions.startsIn").replace("{n}", String(daysUntil(p.startDate)))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreatePromotionModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreatePromotionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<PromoType>("Percentage");
  const [value, setValue] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [channels, setChannels] = useState<PromoChannel[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cap, setCap] = useState(1000);

  function toggleCondition(c: string) {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }
  function toggleChannel(c: PromoChannel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }
  function handleCreate() {
    onClose();
    setCode("");
    setName("");
    setValue("");
    setConditions([]);
    setChannels([]);
    setStartDate("");
    setEndDate("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("marketing.promotions.createModal.title")}
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleCreate}>{t("marketing.promotions.createModal.confirm")}</Button>
        </>
      }
    >
      <div className="octo-scroll flex max-h-[60vh] flex-col gap-3 overflow-y-auto pe-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t("marketing.promotions.createModal.code")} value={code} onChange={(e) => setCode(e.target.value)} />
          <Input label={t("marketing.promotions.createModal.name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Select label={t("marketing.promotions.col.type")} value={type} onChange={(e) => setType(e.target.value as PromoType)}>
            {ALL_TYPES.map((ty) => (
              <option key={ty} value={ty}>{t(labelKey(ty))}</option>
            ))}
          </Select>
          <Input label={t("marketing.promotions.col.value")} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>

        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("marketing.promotions.col.conditions")}
          </span>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {CONDITION_OPTIONS.map((c) => (
              <Checkbox key={c} label={c} checked={conditions.includes(c)} onChange={() => toggleCondition(c)} />
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("marketing.promotions.col.channels")}
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {ALL_CHANNELS.map((c) => (
              <Checkbox key={c} label={t(labelKey(c))} checked={channels.includes(c)} onChange={() => toggleChannel(c)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t("marketing.promotions.createModal.startDate")} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label={t("marketing.promotions.createModal.endDate")} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Input label={t("marketing.promotions.createModal.usageCap")} type="number" min={0} value={cap} onChange={(e) => setCap(Number(e.target.value))} />
      </div>
    </Modal>
  );
}
