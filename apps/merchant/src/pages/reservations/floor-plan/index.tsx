import { useEffect, useMemo, useRef, useState } from "react";
import { Armchair, Clock3, LayoutGrid, Plus, Pencil, Trash2, X, Move } from "lucide-react";
import { Tabs, Modal, Button, Input, Select } from "@ui/primitives";
import {
  floorTables as initialFloorTables,
  zones,
  zoneMetrics,
  type FloorTable,
  type TableShape,
  type TableStatus,
  type ZoneName,
} from "@/shared/api/mock-reservations";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_COLOR: Record<TableStatus, string> = {
  Available: "var(--octo-card)",
  Occupied: "#0D6EFD",
  Reserved: "#6C4DFF",
  "Needs Cleaning": "#F59E0B",
  Blocked: "#9ca3af",
};

const STATUS_TEXT: Record<TableStatus, string> = {
  Available: "var(--octo-text-primary)",
  Occupied: "#ffffff",
  Reserved: "#ffffff",
  "Needs Cleaning": "#ffffff",
  Blocked: "#ffffff",
};

const STATUS_KEY: Record<TableStatus, string> = {
  Available: "status.available",
  Occupied: "reservations.floorPlan.status.occupied",
  Reserved: "reservations.floorPlan.status.reserved",
  "Needs Cleaning": "reservations.floorPlan.status.needsCleaning",
  Blocked: "reservations.floorPlan.status.blocked",
};

const ZONE_KEY: Record<ZoneName, string> = {
  "Main Hall": "reservations.floorPlan.zone.mainHall",
  Terrace: "reservations.floorPlan.zone.terrace",
  "Family Section": "reservations.floorPlan.zone.familySection",
  "Private Rooms": "reservations.floorPlan.zone.privateRooms",
};

const STATUSES: TableStatus[] = ["Available", "Occupied", "Reserved", "Needs Cleaning", "Blocked"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface TableFormState {
  number: string;
  zone: ZoneName;
  shape: TableShape;
  seats: number;
  status: TableStatus;
}

export function FloorPlanPage() {
  const { t } = useI18n();
  const [zone, setZone] = useState<ZoneName>(zones[0]);
  const [tables, setTables] = useState<FloorTable[]>(() => [...initialFloorTables]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TableFormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoneTables = useMemo(() => tables.filter((tbl) => tbl.zone === zone), [tables, zone]);
  const selected = tables.find((tbl) => tbl.id === selectedId) ?? null;

  const occupancyPct = Math.round(
    (zoneTables.filter((tbl) => tbl.status === "Occupied").length / Math.max(zoneTables.length, 1)) * 100
  );

  useEffect(() => {
    if (!draggingId) return;
    function onMove(e: MouseEvent) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const xPct = clamp(((e.clientX - rect.left) / rect.width) * 100, 3, 97);
      const yPct = clamp(((e.clientY - rect.top) / rect.height) * 100, 3, 97);
      setTables((prev) => prev.map((tbl) => (tbl.id === draggingId ? { ...tbl, x: xPct, y: yPct } : tbl)));
    }
    function onUp() {
      setDraggingId(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingId]);

  function openAddForm() {
    setEditingId(null);
    const used = new Set(tables.map((tbl) => tbl.number));
    let next = 1;
    while (used.has(`T-${String(next).padStart(2, "0")}`)) next += 1;
    setFormState({ number: `T-${String(next).padStart(2, "0")}`, zone, shape: "round", seats: 2, status: "Available" });
  }

  function openEditForm(tbl: FloorTable) {
    setEditingId(tbl.id);
    setFormState({ number: tbl.number, zone: tbl.zone, shape: tbl.shape, seats: tbl.seats, status: tbl.status });
  }

  function closeForm() {
    setFormState(null);
    setEditingId(null);
  }

  function saveForm() {
    if (!formState) return;
    if (editingId) {
      setTables((prev) =>
        prev.map((tbl) =>
          tbl.id === editingId
            ? { ...tbl, number: formState.number, zone: formState.zone, shape: formState.shape, seats: formState.seats, status: formState.status }
            : tbl
        )
      );
    } else {
      const id = `ft-${Date.now()}`;
      const newTable: FloorTable = {
        id,
        zone: formState.zone,
        number: formState.number,
        shape: formState.shape,
        seats: formState.seats,
        x: 50,
        y: 50,
        size: formState.seats > 6 ? 22 : formState.seats > 2 ? 16 : 12,
        status: formState.status,
      };
      setTables((prev) => [...prev, newTable]);
      setZone(formState.zone);
      setSelectedId(id);
    }
    closeForm();
  }

  function deleteTable(id: string) {
    if (!window.confirm(t("reservations.floorPlan.deleteConfirm"))) return;
    setTables((prev) => prev.filter((tbl) => tbl.id !== id));
    setSelectedId(null);
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("reservations.floorPlan.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("reservations.floorPlan.subtitle")}
          </p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAddForm}>
          {t("reservations.floorPlan.addTable")}
        </Button>
      </header>

      <div className="mt-4">
        <Tabs
          items={zones.map((z) => ({ id: z, label: t(ZONE_KEY[z]) }))}
          value={zone}
          onChange={(id) => { setZone(id as ZoneName); setSelectedId(null); }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[11px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {STATUSES.map((status) => (
            <span key={status} className="flex items-center gap-1.5 text-[11px] text-[var(--octo-text-secondary)]">
              <span
                className="h-3 w-3 shrink-0 rounded-[3px] border border-[var(--octo-border-input)]"
                style={{
                  backgroundColor: STATUS_COLOR[status],
                  backgroundImage:
                    status === "Blocked"
                      ? "repeating-linear-gradient(45deg, #d8d8de 0, #d8d8de 2px, transparent 2px, transparent 4px)"
                      : undefined,
                }}
              />
              {t(STATUS_KEY[status])}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[var(--octo-text-faint)]">
          <Move size={12} /> {t("reservations.floorPlan.dragHint")}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_300px] lg:items-start">
        <section
          ref={containerRef}
          className="relative min-h-[420px] overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-row-hover)] p-3"
        >
          {zoneTables.map((tbl) => (
            <TableMarker
              key={tbl.id}
              table={tbl}
              selected={tbl.id === selectedId}
              dragging={tbl.id === draggingId}
              onSelect={() => setSelectedId(tbl.id)}
              onDragStart={() => {
                setSelectedId(tbl.id);
                setDraggingId(tbl.id);
              }}
            />
          ))}
          {zoneTables.length === 0 && (
            <p className="absolute inset-0 grid place-items-center text-[12.5px] text-[var(--octo-text-muted)]">
              {t("reservations.floorPlan.emptyZone")}
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <div className="flex items-center gap-2">
              <LayoutGrid size={15} className="text-[var(--octo-text-muted)]" />
              <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(ZONE_KEY[zone])}</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  {t("reservations.floorPlan.panel.occupancy")}
                </dt>
                <dd className="mt-0.5 text-[20px] font-bold text-[var(--octo-text-primary)]">{occupancyPct}%</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  <Clock3 size={11} /> {t("reservations.floorPlan.panel.turnTime")}
                </dt>
                <dd className="mt-0.5 text-[20px] font-bold text-[var(--octo-text-primary)]">
                  {t("common.minuteUnit").replace("{n}", String(zoneMetrics[zone].avgTurnTimeMin))}
                </dd>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Armchair size={15} className="text-[var(--octo-text-muted)]" />
                <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
                  {selected ? selected.number : t("reservations.floorPlan.panel.selectPrompt")}
                </h2>
              </div>
              {selected && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={t("reservations.floorPlan.panel.edit")}
                    onClick={() => openEditForm(selected)}
                    className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={t("reservations.floorPlan.panel.delete")}
                    onClick={() => deleteTable(selected.id)}
                    className="grid h-7 w-7 place-items-center rounded-[7px] text-[#dc2626] transition-colors hover:bg-error/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {selected ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-[var(--octo-text-muted)]">{t("reservations.floorPlan.panel.status")}</span>
                  <span className="font-medium text-[var(--octo-text-primary)]">{t(STATUS_KEY[selected.status])}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-[var(--octo-text-muted)]">{t("reservations.floorPlan.panel.capacity")}</span>
                  <span className="font-medium text-[var(--octo-text-primary)]">
                    {selected.occupiedSeats ?? 0}/{selected.seats}
                  </span>
                </div>

                <div>
                  <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                    {t("reservations.floorPlan.panel.currentOrder")}
                  </h3>
                  {selected.currentOrder ? (
                    <div className="mt-1.5 rounded-[9px] border border-[var(--octo-divider)] px-3 py-2">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-[var(--octo-text-primary)]">{selected.currentOrder.id}</span>
                        <span className="font-semibold text-[var(--octo-text-primary)]">{selected.currentOrder.total}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--octo-text-muted)]">
                        <span>{selected.currentOrder.items} {t("customers.drawer.items")}</span>
                        <span>
                          {t("reservations.floorPlan.panel.startedAt")} {selected.currentOrder.startedAt}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-muted)]">{t("reservations.floorPlan.panel.noOrder")}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12.5px] text-[var(--octo-text-muted)]">{t("reservations.floorPlan.panel.selectPrompt")}</p>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={Boolean(formState)}
        onClose={closeForm}
        title={
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
              {editingId ? t("reservations.floorPlan.editTable") : t("reservations.floorPlan.addTable")}
            </span>
            <button
              type="button"
              aria-label={t("common.cancel")}
              onClick={closeForm}
              className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <X size={15} />
            </button>
          </div>
        }
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeForm}>
              {t("reservations.floorPlan.form.cancel")}
            </Button>
            <Button size="sm" onClick={saveForm} disabled={!formState?.number.trim()}>
              {t("reservations.floorPlan.form.save")}
            </Button>
          </>
        }
      >
        {formState && (
          <div className="flex flex-col gap-3">
            <Input
              label={t("reservations.floorPlan.form.number")}
              value={formState.number}
              onChange={(e) => setFormState((f) => (f ? { ...f, number: e.target.value } : f))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t("reservations.floorPlan.form.zone")}
                value={formState.zone}
                onChange={(e) => setFormState((f) => (f ? { ...f, zone: e.target.value as ZoneName } : f))}
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {t(ZONE_KEY[z])}
                  </option>
                ))}
              </Select>
              <Select
                label={t("reservations.floorPlan.form.shape")}
                value={formState.shape}
                onChange={(e) => setFormState((f) => (f ? { ...f, shape: e.target.value as TableShape } : f))}
              >
                <option value="round">{t("reservations.floorPlan.form.shape.round")}</option>
                <option value="rect">{t("reservations.floorPlan.form.shape.rect")}</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={1}
                max={20}
                label={t("reservations.floorPlan.form.seats")}
                value={formState.seats}
                onChange={(e) => setFormState((f) => (f ? { ...f, seats: Number(e.target.value) || 1 } : f))}
              />
              <Select
                label={t("reservations.floorPlan.form.status")}
                value={formState.status}
                onChange={(e) => setFormState((f) => (f ? { ...f, status: e.target.value as TableStatus } : f))}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(STATUS_KEY[status])}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TableMarker({
  table,
  selected,
  dragging,
  onSelect,
  onDragStart,
}: {
  table: FloorTable;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
}) {
  const { t } = useI18n();
  const isRound = table.shape === "round";

  return (
    <button
      type="button"
      onMouseDown={onDragStart}
      onClick={onSelect}
      aria-label={table.number}
      // Physical room layout — deliberately NOT a logical (RTL-flipping)
      // position. The tables' real-world arrangement doesn't mirror just
      // because the interface language switches to Arabic.
      className={`absolute grid -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center border-2 text-center transition-shadow active:cursor-grabbing ${isRound ? "rounded-full" : "rounded-[10px]"} ${selected ? "ring-2 ring-offset-2 ring-[#0D6EFD] ring-offset-[var(--octo-row-hover)]" : ""} ${dragging ? "z-10 shadow-lg" : ""}`}
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        width: `${table.size}%`,
        aspectRatio: isRound ? "1 / 1" : "4 / 3",
        borderColor: table.status === "Available" ? "var(--octo-border-input)" : STATUS_COLOR[table.status],
        backgroundColor: STATUS_COLOR[table.status],
        backgroundImage:
          table.status === "Blocked"
            ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0, rgba(255,255,255,0.35) 3px, transparent 3px, transparent 7px)"
            : undefined,
        color: STATUS_TEXT[table.status],
      }}
    >
      <span className="text-[11px] font-bold leading-tight">{table.number}</span>
      <span className="text-[9.5px] leading-tight opacity-90">
        {table.occupiedSeats ?? 0}/{table.seats} {t("reservations.floorPlan.seatsUnit")}
      </span>
    </button>
  );
}
