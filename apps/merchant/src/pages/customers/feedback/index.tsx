import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, Search, Star, ChevronUp, ChevronDown, MessagesSquare } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, Checkbox, EmptyState, Input, Select } from "@ui/primitives";
import {
  feedbackStats,
  feedbackRows,
  ratingDistribution,
  type FeedbackChannel,
  type FeedbackCategory,
  type FeedbackRow,
  type FeedbackStatus,
} from "@/shared/api/mock-customers";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<FeedbackStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  New: "info",
  "In Progress": "warning",
  Resolved: "success",
  Escalated: "error",
};

const STATUS_KEY: Record<FeedbackStatus, string> = {
  New: "customers.feedback.status.new",
  "In Progress": "customers.feedback.status.inProgress",
  Resolved: "customers.feedback.status.resolved",
  Escalated: "customers.feedback.status.escalated",
};

const CHANNEL_KEY: Record<FeedbackChannel, string> = {
  "In-app": "customers.feedback.channel.inApp",
  WhatsApp: "customers.feedback.channel.whatsapp",
  Google: "customers.feedback.channel.google",
  Aggregator: "customers.feedback.channel.aggregator",
};

const CATEGORY_KEY: Record<FeedbackCategory, string> = {
  "Food Quality": "customers.feedback.category.foodQuality",
  Service: "customers.feedback.category.service",
  "Delivery Time": "customers.feedback.category.deliveryTime",
  "Wrong Order": "customers.feedback.category.wrongOrder",
  Cleanliness: "customers.feedback.category.cleanliness",
  Pricing: "customers.feedback.category.pricing",
};

const CHANNELS: FeedbackChannel[] = ["In-app", "WhatsApp", "Google", "Aggregator"];
const CATEGORIES: FeedbackCategory[] = ["Food Quality", "Service", "Delivery Time", "Wrong Order", "Cleanliness", "Pricing"];
const STATUSES: FeedbackStatus[] = ["New", "In Progress", "Resolved", "Escalated"];

type SortKey = "rating" | "date";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < rating ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[var(--octo-text-faint)]"}
        />
      ))}
    </span>
  );
}

export function CustomerFeedbackPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<FeedbackRow[]>(() => [...feedbackRows]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let matching = rows.filter((row) => {
      if (q && !row.customer.toLowerCase().includes(q) && !row.comment.toLowerCase().includes(q)) return false;
      if (channelFilter !== "all" && row.channel !== channelFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
    matching = [...matching].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "rating") return (a.rating - b.rating) * dir;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
    });
    return matching;
  }, [query, channelFilter, categoryFilter, statusFilter, sortKey, sortDir, rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => (prev.size === pageRows.length ? new Set() : new Set(pageRows.map((r) => r.id))));
  };

  const clearFilters = () => {
    setQuery("");
    setChannelFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const maxRating = Math.max(...ratingDistribution.map((r) => r.count));

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("customers.feedback.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("customers.feedback.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {feedbackStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("customers.feedback.ratingDistribution")}</h2>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {ratingDistribution.map((r) => (
            <div key={r.stars} className="flex items-center gap-2">
              <span className="flex w-8 items-center gap-0.5 text-[11px] font-medium text-[var(--octo-text-secondary)]">
                {r.stars}<Star size={10} className="fill-[#F59E0B] text-[#F59E0B]" />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--octo-track)]">
                <div
                  className="h-full rounded-full bg-[#F59E0B]"
                  style={{ width: `${(r.count / maxRating) * 100}%` }}
                />
              </div>
              <span className="w-8 text-end text-[11px] text-[var(--octo-text-muted)]">{r.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
              {selectedIds.size} {t("customers.feedback.selected")}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRows((prev) =>
                  prev.map((row) => (selectedIds.has(row.id) ? { ...row, status: "Resolved" as FeedbackStatus } : row))
                );
                setSelectedIds(new Set());
                setToast(t("customers.feedback.resolvedBulk"));
              }}
            >
              {t("customers.feedback.markResolved")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set());
                setToast(t("customers.feedback.assignedBulk"));
              }}
            >
              {t("customers.feedback.assign")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="ms-auto">
              {t("customers.feedback.clearSelection")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-[200px] flex-1"
              placeholder={t("customers.feedback.searchPlaceholder")}
              icon={<Search size={13} />}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            />
            <Select className="w-[150px]" value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("customers.feedback.filter.allChannels")}</option>
              {CHANNELS.map((c) => <option key={c} value={c}>{t(CHANNEL_KEY[c])}</option>)}
            </Select>
            <Select className="w-[160px]" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("customers.feedback.filter.allCategories")}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(CATEGORY_KEY[c])}</option>)}
            </Select>
            <Select className="w-[140px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("customers.feedback.filter.allStatuses")}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
            </Select>
          </div>
        )}

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="w-8 px-2 py-2">
                  <Checkbox
                    checked={pageRows.length > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleAll}
                    aria-label={t("customers.feedback.selectAll")}
                  />
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                  onClick={() => toggleSort("date")}
                >
                  <span className="inline-flex items-center gap-1">{t("customers.feedback.col.date")} {sortIcon("date")}</span>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.feedback.col.customer")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.feedback.col.branch")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.feedback.col.channel")}</th>
                <th
                  className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                  onClick={() => toggleSort("rating")}
                >
                  <span className="inline-flex items-center gap-1">{t("customers.feedback.col.rating")} {sortIcon("rating")}</span>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.feedback.col.category")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.feedback.col.status")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.feedback.col.assignedTo")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)] ${row.rating <= 2 ? "bg-[#EF4444]/5" : ""}`}
                >
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} aria-label={row.id} />
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]" onClick={() => navigate(`/customers/feedback/${row.id}`)}>{row.date}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]" onClick={() => navigate(`/customers/feedback/${row.id}`)}>{row.customer}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => navigate(`/customers/feedback/${row.id}`)}>{row.branch}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => navigate(`/customers/feedback/${row.id}`)}>{t(CHANNEL_KEY[row.channel])}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5" onClick={() => navigate(`/customers/feedback/${row.id}`)}><Stars rating={row.rating} /></td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => navigate(`/customers/feedback/${row.id}`)}>{t(CATEGORY_KEY[row.category])}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5" onClick={() => navigate(`/customers/feedback/${row.id}`)}>
                    <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => navigate(`/customers/feedback/${row.id}`)}>{row.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && (
            <EmptyState
              icon={<MessagesSquare size={18} />}
              title={t("customers.feedback.emptyTitle")}
              description={t("customers.feedback.emptyDescription")}
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  {t("customers.clearFilters")}
                </Button>
              }
            />
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("customers.feedback.showing")
                .replace("{from}", String((page - 1) * PAGE_SIZE + 1))
                .replace("{to}", String(Math.min(page * PAGE_SIZE, filtered.length)))
                .replace("{total}", String(filtered.length))}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-[7px] px-2 py-1 hover:bg-[var(--octo-hover)] disabled:opacity-30"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i + 1)}
                  className={`rounded-[7px] px-2 py-1 ${page === i + 1 ? "bg-info/10 font-semibold text-[#0D6EFD]" : "hover:bg-[var(--octo-hover)]"}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-[7px] px-2 py-1 hover:bg-[var(--octo-hover)] disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
