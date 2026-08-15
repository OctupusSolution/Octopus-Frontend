import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Check, CircleCheck, Copy, Link2, Plug, Plus, Search, Settings2, X,
} from "lucide-react";
import { Badge, Button, Input, Modal, Select } from "@ui/primitives";
import {
  integrations, integrationDetails, integrationKpis,
  type Integration, type IntegrationStatus, type IntegrationEventKind,
  type IntegrationDetails, type IntegrationEnvironment,
} from "@/shared/api/mock-settings";
import { StatCard } from "@/widgets/sales-summary-chart";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const CATEGORY_KEY: Record<string, string> = {
  Payments: "settings.category.payments",
  Accounting: "settings.category.accounting",
  "Point of Sale": "settings.category.pos",
  HR: "settings.category.hr",
  Messaging: "settings.category.messaging",
  "Tax Compliance": "settings.category.tax",
  BNPL: "settings.category.bnpl",
};

const STATUS_TONE: Record<IntegrationStatus, "success" | "error" | "info" | "neutral"> = {
  Connected: "success",
  Error: "error",
  "Not Connected": "neutral",
  Syncing: "info",
};

const EVENT_ICON: Record<IntegrationEventKind, React.ElementType> = {
  sync: CircleCheck,
  error: AlertTriangle,
  test: Plug,
  webhook: Link2,
};
const EVENT_KEY: Record<IntegrationEventKind, string> = {
  sync: "settings.integrations.event.sync",
  error: "settings.integrations.event.error",
  test: "settings.integrations.event.test",
  webhook: "settings.integrations.event.webhook",
};

function timeLabel(value: string, t: (key: string) => string): string {
  if (value === "just now") return t("common.justNow");
  const min = value.match(/^(\d+) minutes? ago$/);
  if (min) return t("common.minutesAgo").replace("{n}", min[1]);
  const hr = value.match(/^(\d+) hours? ago$/);
  if (hr) return t("common.hoursAgo").replace("{n}", hr[1]);
  if (value === "Yesterday") return t("settings.integrations.time.yesterday");
  const days = value.match(/^(\d+) days? ago$/);
  if (days) return t("settings.integrations.time.daysAgo").replace("{n}", days[1]);
  return value;
}

function Copyable({ value, display, t }: { value: string; display: string; t: (k: string) => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex min-w-0 items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 font-mono text-[11px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
    >
      <span className="truncate" dir="ltr">{display}</span>
      {copied ? <Check size={11} className="shrink-0 text-[#16a34a]" /> : <Copy size={11} className="shrink-0 text-[var(--octo-text-faint)]" />}
    </button>
  );
}

function IntegrationDrawer({
  integration, detailsById, onClose, onTested,
}: {
  integration: Integration | null;
  detailsById: Record<string, IntegrationDetails>;
  onClose: () => void;
  onTested: () => void;
}) {
  const { t } = useI18n();
  const [testing, setTesting] = useState(false);
  const [localStatus, setLocalStatus] = useState<IntegrationStatus | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const details = integration ? detailsById[integration.id] : null;
  const status: IntegrationStatus = localStatus ?? integration?.status ?? "Not Connected";
  const connected = status !== "Not Connected";
  const envLabel = details?.environment === "Live" ? "settings.integrations.env.live" : "settings.integrations.env.test";

  function onTest() {
    if (!integration) return;
    setTesting(true);
    window.setTimeout(() => {
      setTesting(false);
      onTested();
    }, 900);
  }

  return (
    <Modal
      open={integration !== null}
      onClose={onClose}
      title={
        integration && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                style={{ backgroundColor: `${integration.color}1A`, color: integration.color }}
              >
                {integration.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[var(--octo-text-primary)]">{integration.name}</p>
                <p className="text-[11px] text-[var(--octo-text-muted)]">{t(labelKey(integration.category))}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("settings.integrations.close")}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <X size={15} />
            </button>
          </div>
        )
      }
      footer={
        <div className="flex items-center gap-2">
          {connected && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#EF4444]"
              onClick={() => {
                if (!integration) return;
                setLocalStatus("Not Connected");
                setFeedback(t("settings.integrations.disconnected").replace("{name}", integration.name));
              }}
            >
              {t("settings.integrations.disconnect")}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={<Settings2 size={13} />}
            onClick={() => {
              if (!integration) return;
              setLocalStatus("Connected");
              setFeedback(
                (connected ? t("settings.integrations.configured") : t("settings.integrations.connected"))
                  .replace("{name}", integration.name)
              );
            }}
          >
            {connected ? t("settings.configure") : t("settings.connect")}
          </Button>
        </div>
      }
    >
      {integration && details && (
        <div className="octo-scroll max-h-[60vh] overflow-y-auto pe-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[status]}>{t(labelKey(status))}</Badge>
            <Badge tone={details.environment === "Live" ? "info" : "neutral"}>{t(envLabel)}</Badge>
          </div>

          <p className="mt-3 text-[12px] text-[var(--octo-text-secondary)]">
            {t("settings.integrations.lastSync")} · {timeLabel(integration.lastSync, t)}
          </p>

          {status === "Error" && (
            <p className="mt-3 rounded-[9px] bg-[#EF4444]/10 px-3 py-2 text-[11.5px] text-[#EF4444]">
              {t("settings.integrations.errorHint")}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("settings.integrations.webhook")}
              </p>
              <div className="mt-1.5 flex min-w-0 items-center rounded-[9px] border border-[var(--octo-border-input)] px-2 py-1.5">
                <Copyable value={details.webhookUrl} display={details.webhookUrl} t={t} />
              </div>
            </div>

            {details.maskedKey && (
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  {t("settings.integrations.apiKey")}
                </p>
                <div className="mt-1.5 flex min-w-0 items-center rounded-[9px] border border-[var(--octo-border-input)] px-2 py-1.5">
                  <Copyable value={details.maskedKey} display={details.maskedKey} t={t} />
                </div>
              </div>
            )}

            <div>
              <Button variant="secondary" size="sm" icon={<Plug size={13} />} disabled={!connected || testing} onClick={onTest}>
                {testing ? t("settings.integrations.testing") : t("settings.integrations.test")}
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("settings.integrations.events")}
            </p>
            {details.events.length === 0 ? (
              <p className="mt-2 rounded-[9px] bg-[var(--octo-hover)] px-3 py-3 text-[11.5px] text-[var(--octo-text-muted)]">
                {t("settings.integrations.noEvents")}
              </p>
            ) : (
              <div className="mt-2 flex flex-col">
                {details.events.map((event) => {
                  const Icon = EVENT_ICON[event.kind];
                  return (
                    <div key={event.id} className="flex items-start gap-3 border-b border-[var(--octo-row-border)] py-2.5 last:border-0">
                      <span
                        className={
                          event.kind === "error"
                            ? "mt-0.5 text-[#EF4444]"
                            : event.kind === "sync"
                              ? "mt-0.5 text-[#22C55E]"
                              : "mt-0.5 text-[#0D6EFD]"
                        }
                      >
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] text-[var(--octo-text-primary)]">{event.label}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--octo-text-faint)]">{timeLabel(event.time, t)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {feedback && (
            <div className="mt-4 rounded-[9px] bg-[#22C55E]/10 px-3 py-2 text-[11.5px] font-medium text-[#16a34a]">
              {feedback}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

const CUSTOM_COLORS: readonly string[] = ["#2ec9c0", "#081026", "#14B8A6", "#8b7cf0", "#22c9d9", "#5b8def"];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "integration";
}

function maskKey(value: string): string {
  return value.length > 4 ? `${value.slice(0, 3)}_••••••••${value.slice(-4)}` : "••••••••";
}

function AddIntegrationModal({
  open, onClose, onSave, existingNames,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    category: string;
    environment: IntegrationEnvironment;
    webhookUrl: string;
    maskedKey?: string;
  }) => void;
  existingNames: readonly string[];
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Payments");
  const [environment, setEnvironment] = useState<IntegrationEnvironment>("Test");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCategory("Payments");
    setEnvironment("Test");
    setWebhookUrl("");
    setApiKey("");
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("settings.integrations.add.nameRequired"));
      return;
    }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError(t("settings.integrations.add.nameExists"));
      return;
    }
    onSave({
      name: trimmed,
      category,
      environment,
      webhookUrl: webhookUrl.trim() || `https://al-bahri.sa/webhooks/${slugify(trimmed)}`,
      maskedKey: apiKey.trim() ? maskKey(apiKey.trim()) : undefined,
    });
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("settings.integrations.add.title")}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label={t("settings.integrations.close")}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <X size={15} />
          </button>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={submit}>
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Input
          label={t("settings.integrations.add.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Moyasar"
          error={error ?? undefined}
          autoFocus
        />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Select
            label={t("settings.integrations.add.category")}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.keys(CATEGORY_KEY).map((c) => (
              <option key={c} value={c}>{t(labelKey(c))}</option>
            ))}
          </Select>
          <Select
            label={t("settings.integrations.add.environment")}
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as IntegrationEnvironment)}
          >
            <option value="Test">{t("settings.integrations.env.test")}</option>
            <option value="Live">{t("settings.integrations.env.live")}</option>
          </Select>
        </div>
        <Input
          label={t("settings.integrations.add.webhookUrl")}
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder={`https://al-bahri.sa/webhooks/${slugify(name.trim()) || "integration"}`}
          dir="ltr"
          className="text-start"
        />
        <Input
          label={t("settings.integrations.add.apiKey")}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="pk_test_…"
          dir="ltr"
          className="text-start"
        />
      </div>
    </Modal>
  );
}

export function IntegrationsSettingsPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [items, setItems] = useState<Integration[]>(() => [...integrations]);
  const [detailsById, setDetailsById] = useState<Record<string, IntegrationDetails>>(() => ({ ...integrationDetails }));

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, categoryFilter, items]);

  const kpis = useMemo(
    () =>
      integrationKpis.map((k) => ({
        ...k,
        value: String(
          k.label === "Integrations"
            ? items.length
            : k.label === "Connected"
              ? items.filter((i) => i.status === "Connected").length
              : k.label === "Syncing"
                ? items.filter((i) => i.status === "Syncing").length
                : items.filter((i) => i.status === "Error").length
        ),
      })),
    [items]
  );

  const drawerIntegration = items.find((i) => i.id === drawerId) ?? null;

  function handleAdd(data: {
    name: string;
    category: string;
    environment: IntegrationEnvironment;
    webhookUrl: string;
    maskedKey?: string;
  }) {
    const id = `custom-${Date.now()}`;
    const item: Integration = {
      id,
      name: data.name,
      category: data.category,
      status: "Not Connected",
      lastSync: "Never",
      color: CUSTOM_COLORS[items.length % CUSTOM_COLORS.length],
    };
    setItems((prev) => [...prev, item]);
    setDetailsById((prev) => ({
      ...prev,
      [id]: { id, environment: data.environment, webhookUrl: data.webhookUrl, maskedKey: data.maskedKey, events: [] },
    }));
    setAdding(false);
    setDrawerId(id);
    setToast(t("settings.integrations.added"));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.integrations.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.integrations.subtitle")}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setAdding(true)}>
          {t("settings.integrations.addIntegration")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[240px]">
            <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("settings.integrations.search")}
              className="ps-8"
              aria-label={t("settings.integrations.search")}
            />
          </div>
          <div className="w-full lg:w-[200px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label={t("settings.integrations.filterCategory")}
              className="w-full appearance-none rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 pe-8 text-[12.5px] text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30"
            >
              <option value="all">{t("settings.integrations.allCategories")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{t(labelKey(c))}</option>
              ))}
            </select>
          </div>
          <p className="lg:ms-auto text-[11.5px] text-[var(--octo-text-faint)]">
            {t("settings.integrations.showing").replace("{n}", String(filtered.length))}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setDrawerId(row.id)}
              className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px] text-start transition-colors hover:border-[var(--octo-border-input)] hover:bg-[var(--octo-row-hover)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                    style={{ backgroundColor: `${row.color}1A`, color: row.color }}
                  >
                    {row.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{row.name}</p>
                    <p className="text-[11px] text-[var(--octo-text-muted)]">{t(labelKey(row.category))}</p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[row.status]}>{t(labelKey(row.status))}</Badge>
              </div>

              <p className="mt-3 text-[11.5px] text-[var(--octo-text-faint)]">
                {t("settings.lastSync").replace("{n}", timeLabel(row.lastSync, t))}
              </p>
            </button>
          ))}
        </div>
      </section>

      <IntegrationDrawer
        integration={drawerIntegration}
        detailsById={detailsById}
        onClose={() => setDrawerId(null)}
        onTested={() => setToast(t("settings.integrations.testPassed"))}
      />

      <AddIntegrationModal
        open={adding}
        onClose={() => setAdding(false)}
        onSave={handleAdd}
        existingNames={items.map((i) => i.name)}
      />

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
