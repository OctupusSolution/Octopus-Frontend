import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvent } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Clock, Wallet, X, Zap, Plus } from "lucide-react";
import { Modal, Table, THead, TBody, TR, TH, TD, Button, Input, Select } from "@ui/primitives";
import { deliveryZones, uncoveredRequestsCount, polygon, type DeliveryZone, type City } from "@/shared/api/mock-delivery";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTheme } from "@/app/providers/theme-provider";
import { labelKey } from "@/shared/lib/labels";

// Fixed pixel radius (not meters) — CircleMarker stays a consistent-looking
// blob regardless of zoom, which is what a small overview widget wants.
function zoneRadius(sizeKm2: number): number {
  return Math.max(10, Math.min(22, sizeKm2 * 1.4));
}

function computeBounds(zones: readonly DeliveryZone[]): LatLngBoundsExpression {
  return [
    [Math.min(...zones.map((z) => z.lat)), Math.min(...zones.map((z) => z.lng))],
    [Math.max(...zones.map((z) => z.lat)), Math.max(...zones.map((z) => z.lng))],
  ];
}

const NEW_ZONE_PALETTE = [
  "#f97316", "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#0ea5e9", "#eab308", "#ef4444",
];

function nextZoneColor(zones: readonly DeliveryZone[]): string {
  const used = new Set(zones.map((z) => z.color));
  return NEW_ZONE_PALETTE.find((c) => !used.has(c)) ?? NEW_ZONE_PALETTE[zones.length % NEW_ZONE_PALETTE.length];
}

// react-leaflet's `bounds` prop only fits once, against whatever size the
// container happened to report at that instant — inside an animated page
// transition / flex grid, that's often 0 or stale, which is what produced
// the wildly-over-zoomed, mispositioned map. Re-fit imperatively once the
// container has its real size, and again on every resize (sidebar
// collapse, window resize) via ResizeObserver.
function MapAutoFit({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [18, 18] });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, bounds]);
  return null;
}

// Registers a one-shot map click listener while `enabled`, used to place a
// new zone. Kept as its own component because useMapEvent needs to run
// inside the MapContainer tree, where `useMap()` resolves.
function MapClickCapture({ enabled, onPick }: { enabled: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvent("click", (e) => {
    if (!enabled) return;
    onPick(e.latlng.lat, e.latlng.lng);
  });
  return null;
}

interface ZoneState {
  active: boolean;
  surge: boolean;
}

interface NewZoneForm {
  name: string;
  city: City;
  districts: string;
  fee: number;
  minOrder: number;
  avgDeliveryMin: number;
  sizeKm2: number;
}

const CITIES: City[] = ["Riyadh", "Jeddah", "Dammam", "Khobar"];

function money(n: number, locale: string): string {
  return `SAR ${new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", { numberingSystem: "latn" }).format(n)}`;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--octo-knob)] shadow transition-all ${
          checked ? "start-[18px]" : "start-0.5"
        }`}
      />
    </button>
  );
}

function SimpleStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return (
    <article className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</p>
      <p className={`mt-2 text-[24px] font-bold leading-none tracking-[-0.01em] ${tone === "warning" ? "text-[#c2660a]" : "text-[var(--octo-text-primary)]"}`}>
        {value}
      </p>
    </article>
  );
}

export function DeliveryZonesPage() {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const [zones, setZones] = useState<DeliveryZone[]>(() => [...deliveryZones]);
  const [zoneState, setZoneState] = useState<Record<string, ZoneState>>(() =>
    Object.fromEntries(deliveryZones.map((z) => [z.id, { active: z.active, surge: z.surgeEnabled }]))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const selected = zones.find((z) => z.id === selectedId) ?? null;
  const highlightId = hoverId ?? selectedId;
  const zoneBounds = useMemo(() => computeBounds(zones), [zones]);

  const activeZonesCount = useMemo(
    () => zones.filter((z) => zoneState[z.id]?.active).length,
    [zones, zoneState]
  );
  const avgFee = useMemo(
    () => Math.round(zones.reduce((sum, z) => sum + z.fee, 0) / zones.length),
    [zones]
  );
  const widestZone = useMemo(
    () => zones.reduce((max, z) => (z.sizeKm2 > max.sizeKm2 ? z : max), zones[0]),
    [zones]
  );

  const toggleActive = (id: string) => {
    setZoneState((prev) => ({ ...prev, [id]: { ...prev[id], active: !prev[id].active } }));
  };
  const toggleSurge = (id: string) => {
    setZoneState((prev) => ({ ...prev, [id]: { ...prev[id], surge: !prev[id].surge } }));
  };

  function handleMapPick(lat: number, lng: number) {
    setPickingLocation(false);
    setPendingLatLng({ lat, lng });
  }

  function handleAddZone(form: NewZoneForm) {
    if (!pendingLatLng) return;
    const id = `zn-custom-${Date.now()}`;
    const seed = Math.random() * 12 + 1;
    const newZone: DeliveryZone = {
      id,
      name: form.name,
      city: form.city,
      color: nextZoneColor(zones),
      districts: form.districts.split(",").map((d) => d.trim()).filter(Boolean),
      fee: form.fee,
      minOrder: form.minOrder,
      avgDeliveryMin: form.avgDeliveryMin,
      active: true,
      sizeKm2: form.sizeKm2,
      thumbShape: polygon(20, 20, 16, 6, seed),
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      feeRules: [
        { band: "0–3 km", fee: form.fee },
        { band: "3–6 km", fee: form.fee + 5 },
        { band: "6–10 km", fee: form.fee + 10 },
        { band: "10+ km", fee: form.fee + 18 },
      ],
      surgeEnabled: false,
      blackoutHours: [],
    };
    setZones((prev) => [...prev, newZone]);
    setZoneState((prev) => ({ ...prev, [id]: { active: true, surge: false } }));
    setPendingLatLng(null);
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("delivery.zones.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("delivery.zones.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SimpleStat label={t("delivery.zones.kpi.active")} value={String(activeZonesCount)} />
        <SimpleStat label={t("delivery.zones.kpi.avgFee")} value={money(avgFee, locale)} />
        <SimpleStat label={t("delivery.zones.kpi.widest")} value={widestZone.name} />
        <SimpleStat label={t("delivery.zones.kpi.uncovered")} value={String(uncoveredRequestsCount)} tone="warning" />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("delivery.zones.mapTitle")}</h2>
          {pickingLocation ? (
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--octo-text-secondary)]">{t("delivery.zones.pickHint")}</span>
              <Button variant="secondary" size="sm" onClick={() => setPickingLocation(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setPickingLocation(true)}>
              {t("delivery.zones.addZone")}
            </Button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
          <div
            className={`isolate h-[220px] w-full overflow-hidden rounded-[10px] bg-[var(--octo-hover)] ${pickingLocation ? "cursor-crosshair" : ""}`}
          >
            <MapContainer
              bounds={zoneBounds}
              boundsOptions={{ padding: [18, 18] }}
              scrollWheelZoom={false}
              zoomSnap={0.25}
              zoomDelta={0.5}
              className="h-full w-full"
            >
              <MapAutoFit bounds={zoneBounds} />
              <MapClickCapture enabled={pickingLocation} onPick={handleMapPick} />
              <TileLayer
                key={theme}
                url={
                  theme === "dark"
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                }
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {zones.map((zone) => (
                <CircleMarker
                  key={zone.id}
                  center={[zone.lat, zone.lng]}
                  radius={zoneRadius(zone.sizeKm2)}
                  pathOptions={{
                    color: zone.color,
                    fillColor: zone.color,
                    fillOpacity: highlightId === zone.id ? 0.85 : 0.45,
                    weight: highlightId === zone.id ? 2.5 : 1,
                  }}
                  eventHandlers={{
                    mouseover: () => setHoverId(zone.id),
                    mouseout: () => setHoverId(null),
                    click: () => setSelectedId(zone.id),
                  }}
                />
              ))}
            </MapContainer>
          </div>
          <div className="octo-scroll flex max-h-[220px] flex-col gap-1.5 overflow-y-auto">
            {zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onMouseEnter={() => setHoverId(zone.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => setSelectedId(zone.id)}
                className={`flex items-center gap-2 rounded-[7px] px-2 py-1 text-start text-[11.5px] transition-colors ${
                  highlightId === zone.id ? "bg-[var(--octo-hover)] font-semibold text-[var(--octo-text-primary)]" : "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: zone.color }} />
                {zone.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {zones.map((zone) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            state={zoneState[zone.id]}
            onToggleActive={() => toggleActive(zone.id)}
            onSelect={() => setSelectedId(zone.id)}
          />
        ))}
      </div>

      <ZoneDrawer
        zone={selected}
        state={selected ? zoneState[selected.id] : undefined}
        onToggleSurge={() => selected && toggleSurge(selected.id)}
        onToggleActive={() => selected && toggleActive(selected.id)}
        onClose={() => setSelectedId(null)}
      />

      <AddZoneModal
        open={Boolean(pendingLatLng)}
        location={pendingLatLng}
        onCancel={() => setPendingLatLng(null)}
        onSave={handleAddZone}
      />
    </div>
  );
}

function ZoneCard({
  zone,
  state,
  onToggleActive,
  onSelect,
}: {
  zone: DeliveryZone;
  state: ZoneState;
  onToggleActive: () => void;
  onSelect: () => void;
}) {
  const { t, locale } = useI18n();

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <button type="button" onClick={onSelect} className="flex items-start gap-3 text-start">
        <svg viewBox="0 0 40 40" className="h-12 w-12 shrink-0 rounded-[8px] bg-[var(--octo-hover)]" aria-hidden="true">
          <polygon points={zone.thumbShape} fill={zone.color} fillOpacity={0.75} stroke={zone.color} strokeWidth={1.5} />
        </svg>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{zone.name}</h2>
          <p className="mt-0.5 truncate text-[11px] text-[var(--octo-text-muted)]">{zone.districts.join(", ")}</p>
        </div>
      </button>

      <div className="grid grid-cols-3 gap-2 border-t border-[var(--octo-divider)] pt-3 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--octo-text-faint)]">{t("delivery.zones.fee")}</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{money(zone.fee, locale)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--octo-text-faint)]">{t("delivery.zones.minOrder")}</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{money(zone.minOrder, locale)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--octo-text-faint)]">{t("delivery.zones.avgTime")}</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{zone.avgDeliveryMin}m</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--octo-divider)] pt-3">
        <span className="text-[11.5px] text-[var(--octo-text-secondary)]">
          {state.active ? t("delivery.zones.active") : t("delivery.zones.inactive")}
        </span>
        <Switch checked={state.active} onChange={onToggleActive} label={state.active ? t("delivery.zones.active") : t("delivery.zones.inactive")} />
      </div>
    </article>
  );
}

function ZoneDrawer({
  zone,
  state,
  onToggleSurge,
  onToggleActive,
  onClose,
}: {
  zone: DeliveryZone | null;
  state: ZoneState | undefined;
  onToggleSurge: () => void;
  onToggleActive: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const open = Boolean(zone) && Boolean(state);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {zone && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />}
            <span className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{zone?.name}</span>
          </div>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <X size={15} />
          </button>
        </div>
      }
    >
      {zone && state && (
        <div className="octo-scroll max-h-[60vh] overflow-y-auto pe-1">
          <p className="flex items-center gap-1.5 text-[12px] text-[var(--octo-text-muted)]">
            <MapPin size={12} /> {zone.city} · {zone.districts.join(", ")}
          </p>

          <div className="mt-3 flex items-center justify-between rounded-[9px] bg-[var(--octo-hover)] px-3 py-2.5">
            <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
              {state.active ? t("delivery.zones.active") : t("delivery.zones.inactive")}
            </span>
            <Switch checked={state.active} onChange={onToggleActive} label={state.active ? t("delivery.zones.active") : t("delivery.zones.inactive")} />
          </div>

          <div className="mt-4">
            <h3 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              <Wallet size={12} /> {t("delivery.zones.drawer.feeRules")}
            </h3>
            <div className="octo-scroll mt-2 overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>{t("delivery.zones.drawer.band")}</TH>
                    <TH>{t("delivery.zones.drawer.feeCol")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {zone.feeRules.map((rule) => (
                    <TR key={rule.band}>
                      <TD className="text-[var(--octo-text-secondary)]">{rule.band}</TD>
                      <TD className="font-medium">{money(rule.fee, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[9px] bg-[var(--octo-hover)] px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--octo-text-primary)]">
              <Zap size={13} className="text-[#F59E0B]" /> {t("delivery.zones.drawer.surge")}
            </span>
            <Switch checked={state.surge} onChange={onToggleSurge} label={t("delivery.zones.drawer.surge")} />
          </div>

          <div className="mt-4">
            <h3 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              <Clock size={12} /> {t("delivery.zones.drawer.blackout")}
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {zone.blackoutHours.map((window, i) => (
                <div key={i} className="rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2">
                  <p className="text-[11.5px] font-medium text-[var(--octo-text-primary)]">
                    {t(labelKey(window.day))} · {t(labelKey(window.reason))}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="time"
                      defaultValue={window.start}
                      className="rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[11.5px] text-[var(--octo-text-primary)]"
                    />
                    <span className="text-[var(--octo-text-faint)]">–</span>
                    <input
                      type="time"
                      defaultValue={window.end}
                      className="rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[11.5px] text-[var(--octo-text-primary)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AddZoneModal({
  open,
  location,
  onCancel,
  onSave,
}: {
  open: boolean;
  location: { lat: number; lng: number } | null;
  onCancel: () => void;
  onSave: (form: NewZoneForm) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [city, setCity] = useState<City>("Riyadh");
  const [districts, setDistricts] = useState("");
  const [fee, setFee] = useState(10);
  const [minOrder, setMinOrder] = useState(50);
  const [avgDeliveryMin, setAvgDeliveryMin] = useState(28);
  const [sizeKm2, setSizeKm2] = useState(10);

  // Reset the form each time a fresh location is picked, so a previous
  // zone's values don't linger into the next one.
  useEffect(() => {
    if (!open) return;
    setName("");
    setCity("Riyadh");
    setDistricts("");
    setFee(10);
    setMinOrder(50);
    setAvgDeliveryMin(28);
    setSizeKm2(10);
  }, [open, location]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), city, districts, fee, minOrder, avgDeliveryMin, sizeKm2 });
  }

  return (
    <Modal open={open} onClose={onCancel} title={t("delivery.zones.form.title")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {location && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)]">
            <MapPin size={12} /> {t("delivery.zones.form.location")}: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        )}
        <Input
          label={t("delivery.zones.form.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <Select label={t("delivery.zones.form.city")} value={city} onChange={(e) => setCity(e.target.value as City)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Input
          label={t("delivery.zones.form.districts")}
          value={districts}
          onChange={(e) => setDistricts(e.target.value)}
          placeholder="Al Olaya, King Fahd"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            min={0}
            label={t("delivery.zones.fee")}
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
          />
          <Input
            type="number"
            min={0}
            label={t("delivery.zones.minOrder")}
            value={minOrder}
            onChange={(e) => setMinOrder(Number(e.target.value))}
          />
          <Input
            type="number"
            min={1}
            label={t("delivery.zones.avgTime")}
            value={avgDeliveryMin}
            onChange={(e) => setAvgDeliveryMin(Number(e.target.value))}
          />
        </div>
        <Input
          type="number"
          min={1}
          step={0.1}
          label={t("delivery.zones.form.size")}
          value={sizeKm2}
          onChange={(e) => setSizeKm2(Number(e.target.value))}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary">
            {t("delivery.zones.form.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
