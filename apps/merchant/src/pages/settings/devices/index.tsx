import { useMemo, useState } from "react";
import {
  Smartphone, Monitor, Printer, Barcode, Layers, CreditCard, Search, CircleCheck,
} from "lucide-react";
import { Badge, Button, Input, Select } from "@ui/primitives";
import { Segmented } from "@ui/primitives";
import { StatCard } from "@/widgets/sales-summary-chart";
import {
  devices, deviceKpis, deviceTypes, deviceStatuses,
  type Device, type DeviceStatus, type DeviceType,
} from "@/shared/api/mock-settings-devices";
import { useI18n } from "@/app/providers/i18n-provider";

const TYPE_ICON: Record<DeviceType, React.ElementType> = {
  "POS Terminal": Smartphone,
  "KDS Screen": Monitor,
  "Receipt Printer": Printer,
  "Kitchen Printer": Printer,
  "Label Printer": Barcode,
  "Cash Drawer": Layers,
  "Card Reader": CreditCard,
};

const TYPE_KEY: Record<DeviceType, string> = {
  "POS Terminal": "settings.devices.type.pos",
  "KDS Screen": "settings.devices.type.kds",
  "Receipt Printer": "settings.devices.type.receipt",
  "Kitchen Printer": "settings.devices.type.kitchen",
  "Label Printer": "settings.devices.type.label",
  "Cash Drawer": "settings.devices.type.cash",
  "Card Reader": "settings.devices.type.card",
};

const STATUS_TONE: Record<DeviceStatus, "success" | "error" | "warning"> = {
  Online: "success",
  Offline: "error",
  "Needs Attention": "warning",
};
const STATUS_KEY: Record<DeviceStatus, string> = {
  Online: "settings.devices.status.online",
  Offline: "settings.devices.status.offline",
  "Needs Attention": "settings.devices.status.attention",
};

const STATUS_ORDER: Record<DeviceStatus, number> = { Offline: 0, "Needs Attention": 1, Online: 2 };

function heartbeatLabel(value: string, t: (key: string) => string): string {
  if (value === "just now") return t("common.justNow");
  const min = value.match(/^(\d+) min ago$/);
  if (min) return t("common.minutesAgo").replace("{n}", min[1]);
  const hr = value.match(/^(\d+) hr ago$/);
  if (hr) return t("common.hoursAgo").replace("{n}", hr[1]);
  return value;
}

const PRINTER_TYPES: ReadonlySet<DeviceType> = new Set(["Receipt Printer", "Kitchen Printer", "Label Printer"]);

function DeviceCard({ device, onTest }: { device: Device; onTest: (device: Device) => void }) {
  const { t } = useI18n();
  const Icon = TYPE_ICON[device.type];
  const isPrinter = PRINTER_TYPES.has(device.type);

  return (
    <article className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-[var(--octo-track)] text-[var(--octo-text-secondary)]">
            <Icon size={15} />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{device.name}</p>
            <p className="text-[11px] text-[var(--octo-text-muted)]">{device.model}</p>
          </div>
        </div>
        <Badge tone={STATUS_TONE[device.status]}>{t(STATUS_KEY[device.status])}</Badge>
      </div>

      <dl className="mt-3 flex flex-col gap-1 text-[11.5px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[var(--octo-text-faint)]">{t("settings.devices.branch")}</dt>
          <dd className="text-end font-medium text-[var(--octo-text-primary)]">{device.branchName}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[var(--octo-text-faint)]">{t("settings.devices.endpoint")}</dt>
          <dd className="text-end font-mono text-[11px] text-[var(--octo-text-secondary)]" dir="ltr">{device.endpoint}</dd>
        </div>
        {device.routing && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--octo-text-faint)]">{t("settings.devices.routing")}</dt>
            <dd className="text-end text-[var(--octo-text-secondary)]">{device.routing}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--octo-text-faint)]">
          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${device.status === "Online" ? "bg-[#22C55E]" : device.status === "Offline" ? "bg-[#EF4444]" : "bg-[#F59E0B]"}`} />
            {t("settings.devices.lastHeartbeat")}: {heartbeatLabel(device.lastHeartbeat, t)}
          </span>
        </span>
        {isPrinter && (
          <Button variant="secondary" size="sm" onClick={() => onTest(device)}>
            {t("settings.devices.testPrint")}
          </Button>
        )}
      </div>
    </article>
  );
}

export function DevicesSettingsPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = devices.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (q && !d.name.toLowerCase().includes(q) && !d.model.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name)
    );
  }, [query, statusFilter, typeFilter]);

  function onTest(device: Device) {
    setToast(t("settings.devices.sent").replace("{name}", device.name));
    window.setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.devices.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.devices.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {deviceKpis.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.devices.allDevices")}</h2>
          <p className="ms-auto text-[11.5px] text-[var(--octo-text-faint)]">
            {t("settings.devices.showing").replace("{n}", String(filtered.length))}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          <Segmented
            options={[
              { id: "all", label: t("settings.devices.filterAll") },
              ...deviceStatuses.map((s) => ({ id: s, label: t(STATUS_KEY[s]) })),
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <div className="relative lg:ms-3 lg:w-[220px]">
            <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("settings.devices.search")}
              className="ps-8"
              aria-label={t("settings.devices.search")}
            />
          </div>
          <div className="lg:ms-auto lg:w-[190px]">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label={t("settings.devices.filterType")}>
              <option value="all">{t("settings.devices.allTypes")}</option>
              {deviceTypes.map((ty) => (
                <option key={ty} value={ty}>{t(TYPE_KEY[ty])}</option>
              ))}
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
            <Search size={20} className="text-[var(--octo-text-faint)]" />
            <p className="mt-2 text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.devices.emptyTitle")}</p>
            <p className="text-[12px] text-[var(--octo-text-muted)]">{t("settings.devices.emptyHint")}</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((device) => (
              <DeviceCard key={device.id} device={device} onTest={onTest} />
            ))}
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
