// What a host can do from the table card: update what is happening at the
// table, message the guest, and look at the order.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, RotateCcw, Send, X } from "lucide-react";
import clsx from "clsx";
import { Button, Modal } from "@ui/primitives";
import { hashString, type LiveStatus, type LiveTableState } from "@/entities/floor-plan";
import { TABLE_TONES } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { NumberStepper, TextAreaField, TextField, SelectField } from "../_shared/fields";
import { formatNumber } from "../_shared/format";
import type { LiveEntry } from "../_shared/use-floor-plan";

const EDITABLE_STATUSES: LiveStatus[] = ["available", "occupied", "reserved", "cleaning"];
const ARRIVAL_OPTIONS = ["15", "30", "60", "90", "120"] as const;
const MINUTE = 60_000;

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-[var(--octo-text-muted)]">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("floorPlan.common.close")}
        className="-me-1 grid h-8 w-8 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/** The update form's body, with no `<Modal>` of its own — so a caller that
 *  already has the table open in a modal (the live floor's own detail
 *  dialog) can show it inline, merged with the rest of the table's detail,
 *  rather than stacking a second modal on top of the first. `embedded` drops
 *  the form's own header and Cancel button, since a merged view has nothing
 *  separate to cancel out of — only Reset (clears the override) and Save
 *  stay. */
export function UpdateTableForm({
  entry,
  now,
  onSave,
  onReset,
  onCancel,
  embedded = false,
}: {
  entry: LiveEntry;
  now: number;
  onSave: (state: LiveTableState) => void;
  onReset: () => void;
  onCancel?: () => void;
  embedded?: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<LiveTableState | null>(null);
  const [arrival, setArrival] = useState<(typeof ARRIVAL_OPTIONS)[number]>("60");

  useEffect(() => {
    setForm(entry.state);
    const minutes = Math.max(0, Math.round((entry.state.since - now) / MINUTE));
    setArrival((ARRIVAL_OPTIONS.find((o) => Number(o) >= minutes) ?? "120") as (typeof ARRIVAL_OPTIONS)[number]);
    // Seeded once per table, when the form first mounts for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.table.id]);

  if (!form) return null;
  const { table } = entry;
  const blocked = table.blocked;
  const withGuest = form.status === "occupied" || form.status === "reserved";

  function save() {
    if (!form) return;
    let since = form.since;
    if (form.status === "reserved") since = now + Number(arrival) * MINUTE;
    else if (form.status !== entry.state.status) since = now;
    const orderId = form.status === "occupied" ? form.orderId || `ORD-${100 + (hashString(`${table.id}${now}`) % 900)}` : "";
    onSave({
      ...form,
      since,
      orderId,
      guests: withGuest ? Math.max(1, Math.min(table.seats, form.guests || 1)) : 0,
      guestName: withGuest ? form.guestName.trim() : "",
    });
  }

  return (
    <>
      {!embedded && (
        <ModalHeader
          title={t("floorPlan.live.update.title").replace("{number}", table.number)}
          subtitle={t("floorPlan.live.update.subtitle")}
          onClose={onCancel ?? (() => undefined)}
        />
      )}
      {blocked ? (
        <p className={clsx("rounded-xl bg-[var(--octo-soft-bg)] p-4 text-[13.5px] text-[var(--octo-text-secondary)]", !embedded && "mt-4")}>{t("floorPlan.live.update.blocked")}</p>
      ) : (
        <div className={clsx("flex flex-col gap-4", !embedded && "mt-5")}>
          <div>
            <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.live.detail.status")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
              {EDITABLE_STATUSES.map((status) => {
                const active = form.status === status;
                const tone = TABLE_TONES[status];
                return (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, status, guests: form.guests || (status === "occupied" || status === "reserved" ? Math.min(2, table.seats) : 0) })}
                    className={clsx(
                      "flex h-10 items-center justify-center gap-1.5 rounded-[10px] border text-[13px] font-medium transition-colors",
                      active ? "" : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                    )}
                    style={active ? { borderColor: tone.stroke, backgroundColor: tone.fill, color: tone.text } : undefined}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.dot }} />
                    {t(`floorPlan.status.${status}.summary`)}
                  </button>
                );
              })}
            </div>
          </div>

          {withGuest && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.live.detail.guests")}</span>
                <NumberStepper value={form.guests || 1} min={1} max={table.seats} label={t("floorPlan.live.detail.guests")} onChange={(guests) => setForm({ ...form, guests })} />
              </div>
              <TextField label={t("floorPlan.live.detail.guestName")} value={form.guestName} onChange={(guestName) => setForm({ ...form, guestName })} maxLength={60} />
            </div>
          )}

          {form.status === "reserved" && (
            <SelectField
              label={t("floorPlan.live.update.arrival")}
              value={arrival}
              onChange={setArrival}
              options={ARRIVAL_OPTIONS.map((value) => ({ value, label: t("floorPlan.live.update.inMinutes").replace("{n}", value) }))}
            />
          )}

          {form.status !== "available" && (
            <TextField label={t("floorPlan.live.detail.server")} value={form.server} onChange={(server) => setForm({ ...form, server })} maxLength={40} />
          )}
          <TextAreaField label={t("floorPlan.live.detail.note")} value={form.note} onChange={(note) => setForm({ ...form, note })} />
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {!blocked ? (
          <Button variant="ghost" icon={<RotateCcw size={14} />} onClick={onReset} className="h-10 justify-center px-3 text-[13px]">
            {t("floorPlan.live.update.reset")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {!embedded && (
            <Button variant="secondary" onClick={onCancel} className="h-10 justify-center px-4 text-[13px]">
              {t("floorPlan.common.cancel")}
            </Button>
          )}
          {!blocked && (
            <Button onClick={save} className="h-10 justify-center px-5 text-[13px]">
              {t("floorPlan.common.save")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

const TEMPLATES = ["ready", "late", "thanks"] as const;

export function SendMessageModal({
  entry,
  open,
  onClose,
  onSent,
}: {
  entry: LiveEntry | null;
  open: boolean;
  onClose: () => void;
  onSent: (guestName: string) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const guest = entry?.state.guestName || t("floorPlan.live.message.guestFallback");

  useEffect(() => {
    if (open && entry) {
      setText(t("floorPlan.live.message.template.ready").replace("{name}", guest).replace("{table}", entry.table.number));
    }
  }, [open, entry, guest, t]);

  if (!entry) return null;

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg p-6">
      <ModalHeader title={t("floorPlan.live.message.title")} subtitle={t("floorPlan.live.message.to").replace("{name}", guest)} onClose={onClose} />
      <div className="mt-4 flex flex-wrap gap-2">
        {TEMPLATES.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setText(t(`floorPlan.live.message.template.${id}`).replace("{name}", guest).replace("{table}", entry.table.number))}
            className="rounded-full border border-[var(--octo-border-input)] px-3 py-1 text-[12.5px] text-[var(--octo-text-secondary)] transition-colors hover:border-[#16A34A] hover:text-[#16A34A]"
          >
            {t(`floorPlan.live.message.chip.${id}`)}
          </button>
        ))}
      </div>
      <TextAreaField className="mt-4" label={t("floorPlan.live.message.body")} value={text} onChange={setText} maxLength={500} />
      <p className="mt-1 text-end text-[11.5px] text-[var(--octo-text-muted)]">{text.length}/500</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} className="h-10 justify-center px-4 text-[13px]">
          {t("floorPlan.common.cancel")}
        </Button>
        <Button
          disabled={!text.trim()}
          icon={<Send size={14} className="rtl:-scale-x-100" />}
          onClick={() => onSent(guest)}
          className="h-10 justify-center bg-[#16A34A] px-5 text-[13px]"
        >
          {t("floorPlan.live.message.send")}
        </Button>
      </div>
    </Modal>
  );
}

const MENU = [
  ["Mixed Grill Platter", 145],
  ["Chicken Kabsa", 68],
  ["Hummus & Bread", 24],
  ["Fattoush Salad", 28],
  ["Grilled Hammour", 92],
  ["Kunafa", 35],
  ["Fresh Lemon Mint", 18],
  ["Arabic Coffee Pot", 30],
] as const;

export function ViewOrderModal({ entry, open, onClose }: { entry: LiveEntry | null; open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  const lines = useMemo(() => {
    if (!entry) return [];
    const seed = hashString(entry.state.orderId || entry.table.number);
    const count = 2 + (seed % 4);
    return Array.from({ length: count }, (_, i) => {
      const [name, price] = MENU[(seed >>> (i * 3)) % MENU.length];
      const qty = 1 + ((seed >>> (i * 5 + 1)) % Math.max(1, Math.min(3, entry.state.guests || 1)));
      return { name, price, qty };
    }).filter((line, i, list) => list.findIndex((l) => l.name === line.name) === i);
  }, [entry]);

  if (!entry) return null;
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const vat = Math.round(subtotal * 0.15 * 100) / 100;
  const money = (value: number) => `${t("floorPlan.common.currency")} ${formatNumber(Number(value.toFixed(2)), locale)}`;

  return (
    <Modal open={open} onClose={onClose} className="max-w-md p-6">
      <ModalHeader
        title={t("floorPlan.live.order.title").replace("{id}", entry.state.orderId)}
        subtitle={t("floorPlan.live.order.subtitle").replace("{table}", entry.table.number).replace("{name}", entry.state.guestName || "—")}
        onClose={onClose}
      />
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--octo-tone-warning-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--octo-tone-warning-text)]">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {t("floorPlan.live.order.inProgress")}
      </span>
      <ul className="mt-4 divide-y divide-[var(--octo-divider)] rounded-xl border border-[var(--octo-border-card)]">
        {lines.map((line) => (
          <li key={line.name} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px]">
            <span className="text-[var(--octo-text-primary)]">
              <span className="me-2 font-semibold text-[var(--octo-text-muted)]">{line.qty}×</span>
              {line.name}
            </span>
            <span className="font-medium text-[var(--octo-text-primary)]">{money(line.price * line.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 flex flex-col gap-1.5 text-[13.5px]">
        <div className="flex justify-between text-[var(--octo-text-secondary)]">
          <dt>{t("floorPlan.live.order.subtotal")}</dt>
          <dd>{money(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-[var(--octo-text-secondary)]">
          <dt>{t("floorPlan.live.order.vat")}</dt>
          <dd>{money(vat)}</dd>
        </div>
        <div className="flex justify-between border-t border-[var(--octo-divider)] pt-2 text-[15px] font-semibold text-[var(--octo-text-primary)]">
          <dt>{t("floorPlan.live.order.total")}</dt>
          <dd>{money(subtotal + vat)}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} className="h-10 justify-center px-4 text-[13px]">
          {t("floorPlan.common.close")}
        </Button>
        <Button icon={<ExternalLink size={14} />} onClick={() => navigate("/orders")} className="h-10 justify-center px-4 text-[13px]">
          {t("floorPlan.live.order.open")}
        </Button>
      </div>
    </Modal>
  );
}
