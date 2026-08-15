import { useState, type ReactNode } from "react";
import { CalendarClock, Pause, Play, Pencil, Plus, PlayCircle, Search, Trash2 } from "lucide-react";
import { Badge, Button, Input, Modal, Select } from "@ui/primitives";
import { StatCard } from "@/widgets/sales-summary-chart";
import { buildKpi } from "../_shared/kpi";
import { formatCount } from "../_shared/format";
import {
  scheduledReports,
  type ReportFormat,
  type ScheduleChannel,
  type ScheduleFrequency,
  type ScheduleStatus,
  type ScheduledReport,
  type ReportType,
} from "@/shared/api/mock-reports";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<ScheduleStatus, "success" | "warning" | "error"> = {
  Active: "success",
  Paused: "warning",
  Failed: "error",
};

const AVATAR_COLORS = ["#0D6EFD", "#6C4DFF", "#22C9D9", "#2ec9c0"];

const REPORT_TYPES: readonly ReportType[] = ["Sales", "Margin", "Channels", "Customers", "Compliance"];
const FREQUENCIES: readonly ScheduleFrequency[] = ["Daily", "Weekly", "Monthly"];
const FORMATS: readonly ReportFormat[] = ["PDF", "Excel", "CSV"];
const CHANNELS: readonly ScheduleChannel[] = ["Email", "WhatsApp"];

type FrequencyFilter = "all" | ScheduleFrequency;
type TypeFilter = "all" | ReportType;

function typeKey(type: ReportType) {
  return `reports.scheduled.type.${type.toLowerCase()}`;
}

export function ScheduledPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<ScheduledReport[]>(() => [...scheduledReports]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduledReport | null>(null);
  const [freqFilter, setFreqFilter] = useState<FrequencyFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");

  const editing = rows.find((row) => row.id === editId) ?? null;

  const openCreate = () => {
    setEditId(null);
    setScheduleOpen(true);
  };

  const saveSchedule = ({
    id,
    name,
    type,
    frequency,
    recipients,
    format,
    channel,
    nextRun,
  }: ScheduleInput) => {
    setRows((prev) => {
      if (id) {
        return prev.map((row) =>
          row.id === id ? { ...row, name, type, frequency, recipients, format, channel, nextRun } : row
        );
      }
      return [
        {
          id: `rep-${Date.now()}`,
          name,
          type,
          frequency,
          recipients,
          format,
          channel,
          nextRun,
          lastRun: "Never",
          status: "Active",
        },
        ...prev,
      ];
    });
  };

  const togglePause = (id: string) =>
    setRows((prev) =>
      prev.map((row) =>
        row.id === id && row.status !== "Failed"
          ? { ...row, status: row.status === "Paused" ? "Active" : "Paused" }
          : row
      )
    );

  const runNow = (id: string) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, lastRun: t("common.justNow") } : row)));

  const confirmDelete = () => {
    if (deleteTarget) setRows((prev) => prev.filter((row) => row.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  // KPI cards are derived from the live rows so pausing/resuming updates them.
  const activeCount = rows.filter((row) => row.status === "Active").length;
  const nextTodayCount = rows.filter((row) => row.nextRun.includes("Today")).length;
  const dailyCount = rows.filter((row) => row.frequency === "Daily").length;
  const weeklyCount = rows.filter((row) => row.frequency === "Weekly").length;
  const monthlyCount = rows.filter((row) => row.frequency === "Monthly").length;

  const kpiCards = [
    buildKpi("sched-active", "reports.scheduled.kpi.active", formatCount(activeCount), "+2", "violet"),
    buildKpi("sched-sent", "reports.scheduled.kpi.sentWeek", "12", "+3", "blue"),
    buildKpi("sched-next", "reports.scheduled.kpi.nextToday", formatCount(nextTodayCount), "+1", "green"),
    {
      ...buildKpi(
        "sched-mix",
        "reports.scheduled.kpi.freqMix",
        `${dailyCount} · ${weeklyCount} · ${monthlyCount}`,
        "—",
        "orange"
      ),
      deltaNote: "",
      subNote: t("reports.scheduled.kpi.freqMixNote"),
    },
  ];

  const visibleRows = rows.filter((row) => {
    const matchesFrequency = freqFilter === "all" || row.frequency === freqFilter;
    const matchesType = typeFilter === "all" || row.type === typeFilter;
    const matchesQuery = query.trim() === "" || row.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesFrequency && matchesType && matchesQuery;
  });

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("reports.scheduled.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("reports.scheduled.subtitle")}</p>
        </div>

        <Button variant="primary" icon={<Plus size={13} />} onClick={openCreate}>
          {t("reports.scheduled.newSchedule")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={15} className="text-[var(--octo-text-muted)]" />
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("reports.scheduled.tableTitle")}</h2>
          </div>
          <span className="text-[11.5px] text-[var(--octo-text-faint)]">
            {t("reports.scheduled.showing").replace("{n}", formatCount(visibleRows.length))}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Select
            label={t("reports.scheduled.filter.frequency")}
            value={freqFilter}
            onChange={(e) => setFreqFilter(e.target.value as FrequencyFilter)}
            className="w-[160px]"
          >
            <option value="all">{t("reports.scheduled.filter.allFrequencies")}</option>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(labelFrequency(f))}
              </option>
            ))}
          </Select>

          <Select
            label={t("reports.scheduled.filter.type")}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="w-[160px]"
          >
            <option value="all">{t("reports.scheduled.filter.allTypes")}</option>
            {REPORT_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {t(typeKey(rt))}
              </option>
            ))}
          </Select>

          <Input
            label={t("common.search")}
            icon={<Search size={14} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("reports.scheduled.searchPlaceholder")}
            className="max-w-[260px]"
          />
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)]">
                {[
                  "reports.scheduled.col.name",
                  "reports.scheduled.col.type",
                  "reports.scheduled.col.frequency",
                  "reports.scheduled.col.recipients",
                  "reports.scheduled.col.format",
                  "reports.scheduled.col.channel",
                  "reports.scheduled.col.nextRun",
                  "reports.scheduled.col.lastRun",
                  "reports.scheduled.col.status",
                  "reports.scheduled.col.actions",
                ].map((key) => (
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
              {visibleRows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.name}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(typeKey(row.type))}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelFrequency(row.frequency))}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <RecipientStack emails={row.recipients} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelFormat(row.format))}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelChannel(row.channel))}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]">{row.nextRun}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{row.lastRun}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={STATUS_TONE[row.status]}>{t(`status.${row.status.toLowerCase()}`)}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="flex items-center gap-1">
                      <IconAction label={t("reports.scheduled.action.runNow")} onClick={() => runNow(row.id)}>
                        <PlayCircle size={13} />
                      </IconAction>
                      <IconAction
                        label={t("reports.scheduled.action.pause")}
                        onClick={() => togglePause(row.id)}
                        disabled={row.status === "Failed"}
                      >
                        {row.status === "Paused" ? <Play size={13} /> : <Pause size={13} />}
                      </IconAction>
                      <IconAction
                        label={t("reports.scheduled.action.edit")}
                        onClick={() => {
                          setEditId(row.id);
                          setScheduleOpen(true);
                        }}
                      >
                        <Pencil size={13} />
                      </IconAction>
                      <IconAction label={t("reports.scheduled.action.delete")} onClick={() => setDeleteTarget(row)}>
                        <Trash2 size={13} />
                      </IconAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ScheduleModal
        key={editing?.id ?? "new"}
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        editTarget={editing}
        onAdd={saveSchedule}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("reports.scheduled.delete.title")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t("reports.scheduled.delete.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
          {t("reports.scheduled.delete.message")} <strong className="text-[var(--octo-text-primary)]">{deleteTarget?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
}

function labelFrequency(frequency: ScheduleFrequency) {
  return `reports.frequency.${frequency.toLowerCase()}`;
}

function labelFormat(format: ReportFormat) {
  return `reports.scheduled.format.${format.toLowerCase()}`;
}

function labelChannel(channel: ScheduleChannel) {
  return `reports.scheduled.channel.${channel.toLowerCase()}`;
}

/* ------------------------------------------------- avatar stack for recipients */

function RecipientStack({ emails }: { emails: readonly string[] }) {
  const shown = emails.slice(0, 2);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {shown.map((email, i) => (
          <span
            key={email}
            className="grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[9.5px] font-bold text-white"
            style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
          >
            {email.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-[var(--octo-text-secondary)]">
        {shown.length === 1 ? emails[0] : emails.length > 2 ? `+${emails.length - 2}` : emails[1]}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- icon button */

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------- schedule modal */

interface ScheduleInput {
  id: string | null;
  name: string;
  type: ReportType;
  frequency: ScheduleFrequency;
  recipients: string[];
  format: ReportFormat;
  channel: ScheduleChannel;
  nextRun: string;
}

function ScheduleModal({
  open,
  onClose,
  editTarget,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  editTarget: ScheduledReport | null;
  onAdd: (input: ScheduleInput) => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<ReportType>(editTarget?.type ?? "Sales");
  const [frequency, setFrequency] = useState<ScheduleFrequency>(editTarget?.frequency ?? "Daily");
  const [time, setTime] = useState(editTarget?.nextRun.match(/(\d{2}:\d{2})/)?.[1] ?? "09:00");
  const [recipients, setRecipients] = useState(editTarget ? editTarget.recipients.join(", ") : "");
  const [format, setFormat] = useState<ReportFormat>(editTarget?.format ?? "PDF");
  const [channel, setChannel] = useState<ScheduleChannel>(editTarget?.channel ?? "Email");

  const save = () => {
    const name = `${t(typeKey(type))} · ${t(labelFrequency(frequency))}`;
    const recipientsList = recipients
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    onAdd({
      id: editTarget?.id ?? null,
      name,
      type,
      frequency,
      recipients: recipientsList.length > 0 ? recipientsList : ["reports@albahri.sa"],
      format,
      channel,
      nextRun: `Today ${time}`,
    });
    setRecipients("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(editTarget ? "reports.scheduled.modal.editTitle" : "reports.scheduled.modal.title")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save}>{t(editTarget ? "reports.scheduled.modal.saveEdit" : "reports.scheduled.modal.save")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Select label={t("reports.scheduled.modal.report")} value={type} onChange={(e) => setType(e.target.value as ReportType)}>
          {REPORT_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {t(typeKey(rt))}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t("reports.scheduled.modal.frequency")}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(labelFrequency(f))}
              </option>
            ))}
          </Select>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("reports.scheduled.modal.time")}
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
            />
          </label>
        </div>

        <Select label={t("reports.scheduled.modal.timezone")} value="Asia/Riyadh" disabled>
          <option value="Asia/Riyadh">Asia/Riyadh</option>
        </Select>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("reports.scheduled.modal.recipients")}
          </span>
          <input
            type="text"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="finance@albahri.sa, gm@albahri.sa"
            className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t("reports.scheduled.modal.format")}
            value={format}
            onChange={(e) => setFormat(e.target.value as ReportFormat)}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {t(labelFormat(f))}
              </option>
            ))}
          </Select>

          <Select
            label={t("reports.scheduled.modal.channel")}
            value={channel}
            onChange={(e) => setChannel(e.target.value as ScheduleChannel)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {t(labelChannel(c))}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  );
}
