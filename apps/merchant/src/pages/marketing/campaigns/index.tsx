import { useEffect, useMemo, useState } from "react";
import { Crown, Megaphone, Send, Users, X } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Input, Select, EmptyState, Button } from "@ui/primitives";
import {
  campaignKpis,
  campaigns,
  type CampaignDetail,
  type CampaignChannel,
  type CampaignStatus,
  type CampaignSegment,
} from "@/shared/api/mock-marketing";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const STATUS_TONE: Record<CampaignStatus, "success" | "info" | "neutral" | "warning"> = {
  Active: "info",
  Scheduled: "info",
  Completed: "neutral",
  Draft: "neutral",
  Paused: "warning",
};

const ALL_CHANNELS: CampaignChannel[] = ["WhatsApp", "SMS", "Email", "Push"];
const ALL_SEGMENTS: CampaignSegment[] = ["All Members", "Gold & Platinum", "Lapsed Customers", "New Signups", "Birthday This Month", "Delivery Regulars"];

function money(n: number): string {
  return `SAR ${n.toLocaleString("en-US")}`;
}

function pct(part: number, whole: number): string {
  if (whole === 0) return "0.0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export function CampaignsPage() {
  const { t } = useI18n();
  const [channelFilter, setChannelFilter] = useState<"All" | CampaignChannel>("All");
  const [segmentFilter, setSegmentFilter] = useState<"All" | CampaignSegment>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | CampaignStatus>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (channelFilter !== "All" && c.channel !== channelFilter) return false;
      if (segmentFilter !== "All" && c.segment !== segmentFilter) return false;
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      return true;
    });
  }, [channelFilter, segmentFilter, statusFilter]);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("marketing.campaigns.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("marketing.campaigns.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {campaignKpis.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-[150px]" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}>
            <option value="All">{t("marketing.campaigns.filter.allChannels")}</option>
            {ALL_CHANNELS.map((c) => (
              <option key={c} value={c}>{t(labelKey(c))}</option>
            ))}
          </Select>
          <Select className="w-[180px]" value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value as typeof segmentFilter)}>
            <option value="All">{t("marketing.campaigns.filter.allSegments")}</option>
            {ALL_SEGMENTS.map((s) => (
              <option key={s} value={s}>{t(labelKey(s))}</option>
            ))}
          </Select>
          <Select className="w-[150px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="All">{t("marketing.campaigns.filter.allStatuses")}</option>
            {(["Active", "Scheduled", "Completed", "Draft", "Paused"] as CampaignStatus[]).map((s) => (
              <option key={s} value={s}>{t(labelKey(s))}</option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Megaphone size={18} />}
            title={t("marketing.campaigns.empty.title")}
            description={t("marketing.campaigns.empty.description")}
            action={<Button variant="secondary" onClick={() => { setChannelFilter("All"); setSegmentFilter("All"); setStatusFilter("All"); }}>{t("marketing.giftCards.clearFilters")}</Button>}
          />
        ) : (
          <div className="octo-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[1160px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  {["marketing.campaigns.col.campaign", "marketing.campaigns.col.channel", "marketing.campaigns.col.segment", "marketing.campaigns.col.sent", "marketing.campaigns.col.delivered", "marketing.campaigns.col.opened", "marketing.campaigns.col.clicked", "marketing.campaigns.col.redeemed", "marketing.campaigns.col.revenue", "marketing.campaigns.col.status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]" onClick={() => setSelectedId(c.id)}>
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{c.name}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span className="text-[var(--octo-text-secondary)]">{t(labelKey(c.channel))}</span>
                      {c.channel === "WhatsApp" && c.templateApproved !== undefined && (
                        <div className="mt-1">
                          <Badge tone={c.templateApproved ? "success" : "warning"}>
                            {c.templateApproved ? t("marketing.campaigns.templateApproved") : t("marketing.campaigns.templatePending")}
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelKey(c.segment))}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]">{c.sent.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="text-[var(--octo-text-primary)]">{c.delivered.toLocaleString()}</div>
                      <div className="text-[10.5px] text-[var(--octo-text-faint)]">{pct(c.delivered, c.sent)}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="text-[var(--octo-text-primary)]">{c.opened.toLocaleString()}</div>
                      <div className="text-[10.5px] text-[var(--octo-text-faint)]">{pct(c.opened, c.sent)}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="text-[var(--octo-text-primary)]">{c.clicked.toLocaleString()}</div>
                      <div className="text-[10.5px] text-[var(--octo-text-faint)]">{pct(c.clicked, c.sent)}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="font-medium text-[var(--octo-text-primary)]">{c.redeemed.toLocaleString()}</div>
                      <div className="text-[10.5px] text-[var(--octo-text-faint)]">{pct(c.redeemed, c.sent)}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{money(c.revenueSar)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <Badge tone={STATUS_TONE[c.status]}>{t(labelKey(c.status))}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CampaignDrawer campaign={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CampaignDrawer({ campaign, onClose }: { campaign: CampaignDetail | null; onClose: () => void }) {
  const { t } = useI18n();
  const open = Boolean(campaign);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("marketing.campaigns.drawer.title")}
        className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[420px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        {campaign && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
              <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("marketing.campaigns.drawer.title")}</h2>
              <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]">
                <X size={15} />
              </button>
            </div>
            <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
              <h3 className="text-[16px] font-bold text-[var(--octo-text-primary)]">{campaign.name}</h3>
              <div className="mt-2">
                <Badge tone={STATUS_TONE[campaign.status]}>{t(labelKey(campaign.status))}</Badge>
              </div>

              {/* message preview as phone bubble */}
              <div className="mt-4">
                <h4 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  <Send size={12} /> {t("marketing.campaigns.drawer.preview")}
                </h4>
                <div className="mt-2 rounded-xl bg-[var(--octo-page-bg)] p-3">
                  <div className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm bg-[#0D6EFD] px-3 py-2.5 text-[12.5px] leading-relaxed text-white shadow-sm">
                    {campaign.messagePreview}
                  </div>
                </div>
              </div>

              {/* audience */}
              <div className="mt-4 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
                <h4 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  <Users size={12} /> {t("marketing.campaigns.drawer.audience")}
                </h4>
                <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-primary)]">{t(labelKey(campaign.segment))}</p>
                <p className="text-[11px] text-[var(--octo-text-muted)]">
                  {t("marketing.campaigns.drawer.estimatedReach").replace("{n}", campaign.estimatedReach.toLocaleString())}
                </p>
              </div>

              {/* schedule */}
              {(campaign.scheduledFor || campaign.recurring) && (
                <div className="mt-3 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
                  <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                    {t("marketing.campaigns.drawer.schedule")}
                  </h4>
                  {campaign.scheduledFor && <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-primary)]">{campaign.scheduledFor}</p>}
                  {campaign.recurring && <p className="text-[11.5px] text-[var(--octo-text-muted)]">{campaign.recurring}</p>}
                </div>
              )}

              {/* A/B test */}
              {campaign.abTest && (
                <div className="mt-4">
                  <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                    {t("marketing.campaigns.drawer.abTest")}
                  </h4>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[campaign.abTest.variantA, campaign.abTest.variantB].map((v) => (
                      <div key={v.label} className="relative rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
                        {campaign.abTest!.winner === v.label && (
                          <span className="absolute -top-2 end-2 flex items-center gap-1 rounded-full bg-[#22C55E] px-2 py-0.5 text-[10px] font-semibold text-white">
                            <Crown size={10} /> {t("marketing.campaigns.drawer.winner")}
                          </span>
                        )}
                        <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("marketing.campaigns.drawer.variant")} {v.label}</p>
                        <p className="mt-1 text-[11px] text-[var(--octo-text-secondary)]">{t("marketing.campaigns.col.opened")}: {v.openRate}%</p>
                        <p className="text-[11px] text-[var(--octo-text-secondary)]">{t("marketing.campaigns.col.clicked")}: {v.clickRate}%</p>
                        <p className="text-[11px] text-[var(--octo-text-secondary)]">{t("marketing.campaigns.drawer.conversion")}: {v.conversionRate}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
