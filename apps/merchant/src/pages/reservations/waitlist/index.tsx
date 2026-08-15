import { useMemo, useState } from "react";
import { ListPlus, Search, Users } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, EmptyState, Input, Modal } from "@ui/primitives";
import { waitlistStats, waitlistRows as initialRows, type WaitlistRow, type WaitlistStatus } from "@/shared/api/mock-reservations";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<WaitlistStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  Waiting: "info",
  Notified: "warning",
  Seated: "success",
  Left: "neutral",
};

const STATUS_KEY: Record<WaitlistStatus, string> = {
  Waiting: "reservations.waitlistPage.status.waiting",
  Notified: "reservations.waitlistPage.status.notified",
  Seated: "status.seated",
  Left: "reservations.waitlistPage.status.left",
};

export function WaitlistPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<WaitlistRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ guest: "", phone: "", partySize: "2", quotedWait: "15" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.guest.toLowerCase().includes(q) || r.phone.includes(q));
  }, [rows, query]);

  const notify = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Notified" } : r)));
    const guest = rows.find((r) => r.id === id)?.guest ?? "";
    setToast(t("reservations.waitlistPage.notifySent").replace("{guest}", guest));
    window.setTimeout(() => setToast(null), 3500);
  };

  const seat = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Seated" } : r)));
  };

  const remove = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, position: i + 1 })));
  };

  const addToWaitlist = () => {
    const nextPosition = rows.length + 1;
    const newRow: WaitlistRow = {
      id: `wl-${Date.now()}`,
      position: nextPosition,
      guest: form.guest || t("reservations.waitlistPage.modal.guestFallback"),
      phone: form.phone || "+9665XXXXXXXX",
      partySize: Number(form.partySize) || 1,
      quotedWaitMin: Number(form.quotedWait) || 0,
      actualWaitMin: 0,
      status: "Waiting",
    };
    setRows((prev) => [...prev, newRow]);
    setForm({ guest: "", phone: "", partySize: "2", quotedWait: "15" });
    setModalOpen(false);
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("reservations.waitlistPage.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("reservations.waitlistPage.subtitle")}
          </p>
        </div>
        <Button variant="primary" icon={<ListPlus size={13} />} onClick={() => setModalOpen(true)}>
          {t("reservations.waitlistPage.addToWaitlist")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {waitlistStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        {toast && (
          <div className="mb-3 rounded-[9px] bg-success/10 px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">
            {toast}
          </div>
        )}

        <Input
          className="max-w-[280px]"
          placeholder={t("common.search")}
          icon={<Search size={13} />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {[
                  "reservations.waitlistPage.col.position",
                  "reservations.waitlistPage.col.guest",
                  "reservations.waitlistPage.col.partySize",
                  "reservations.waitlistPage.col.quotedWait",
                  "reservations.waitlistPage.col.actualWait",
                  "reservations.waitlistPage.col.phone",
                  "reservations.waitlistPage.col.status",
                  "reservations.waitlistPage.col.actions",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const over = row.actualWaitMin > row.quotedWaitMin;
                return (
                  <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.position}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.guest}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.partySize}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">
                      {t("reservations.waitlistPage.minUnit").replace("{n}", String(row.quotedWaitMin))}
                    </td>
                    <td className={`whitespace-nowrap px-2 py-2.5 font-medium ${over ? "text-[#dc2626]" : "text-[var(--octo-text-primary)]"}`}>
                      {t("reservations.waitlistPage.minUnit").replace("{n}", String(row.actualWaitMin))}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.phone}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={row.status === "Seated" || row.status === "Left"}
                          onClick={() => notify(row.id)}
                        >
                          {t("reservations.waitlistPage.action.notify")}
                        </Button>
                        <Button
                          size="sm"
                          disabled={row.status === "Seated" || row.status === "Left"}
                          onClick={() => seat(row.id)}
                        >
                          {t("reservations.waitlistPage.action.seat")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(row.id)}>
                          {t("reservations.waitlistPage.action.remove")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon={<Users size={18} />}
              title={t("reservations.waitlistPage.emptyTitle")}
              description={t("reservations.waitlistPage.emptyDescription")}
              action={
                <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                  {t("customers.clearFilters")}
                </Button>
              }
            />
          )}
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("reservations.waitlistPage.modal.title")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={addToWaitlist}>{t("reservations.waitlistPage.modal.add")}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label={t("reservations.waitlistPage.modal.guestName")}
            value={form.guest}
            onChange={(event) => setForm((f) => ({ ...f, guest: event.target.value }))}
          />
          <Input
            label={t("reservations.waitlistPage.modal.phone")}
            value={form.phone}
            onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min={1}
              label={t("reservations.waitlistPage.modal.partySize")}
              value={form.partySize}
              onChange={(event) => setForm((f) => ({ ...f, partySize: event.target.value }))}
            />
            <Input
              type="number"
              min={0}
              label={t("reservations.waitlistPage.modal.quotedWait")}
              value={form.quotedWait}
              onChange={(event) => setForm((f) => ({ ...f, quotedWait: event.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
