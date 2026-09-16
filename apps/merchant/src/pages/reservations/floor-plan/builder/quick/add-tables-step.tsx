// Quick Box Layout, step 1: how many tables, how they are numbered, and the
// settings every one of them starts with. The summary and preview on the
// right show the exact numbers that will be created — skipping any the plan
// already uses — so "Create 15 Tables" never surprises anyone.
import { useMemo, useState, type ElementType } from "react";
import {
  CalendarCheck,
  Cigarette,
  CigaretteOff,
  Crown,
  DoorOpen,
  Footprints,
  Hash,
  House,
  Lightbulb,
  Lock,
  Maximize,
  Shapes,
  Star,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import {
  DEFAULT_TABLE,
  MAX_QUICK_TABLES,
  MAX_SEATS,
  TABLE_SHAPES,
  TABLE_SIZES,
  allocateTableNumbers,
  type FloorPlanDoc,
  type NumberingDirection,
  type QuickLayoutOptions,
  type TableDefaults,
} from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";
import { Field, NumberStepper, SelectField, TextField } from "../../_shared/fields";
import { TableIcon } from "../../_shared/icons";
import { areaLabel, seatsLabel, shapeLabel, sizeLabel } from "../../_shared/labels";
import { SwitchField } from "../../_shared/switch";

type Preset = 1 | 10 | 20 | 50 | "custom";
const PRESETS: Exclude<Preset, "custom">[] = [1, 10, 20, 50];
const PREVIEW_LIMIT = 15;

type CategoryChip = "indoor" | "outdoor" | "smoking" | "nonSmoking" | "vip" | "regular" | "largeParty" | "blocked";
const CHIPS: { id: CategoryChip; Icon: ElementType }[] = [
  { id: "indoor", Icon: House },
  { id: "outdoor", Icon: DoorOpen },
  { id: "smoking", Icon: Cigarette },
  { id: "nonSmoking", Icon: CigaretteOff },
  { id: "vip", Icon: Crown },
  { id: "regular", Icon: Star },
  { id: "largeParty", Icon: Users },
  { id: "blocked", Icon: Lock },
];

interface FormState extends TableDefaults {
  preset: Preset;
  custom: number;
  numbering: "auto" | "custom";
  prefix: string;
  start: number;
  direction: NumberingDirection;
}

const INITIAL: FormState = {
  ...DEFAULT_TABLE,
  preset: 10,
  custom: 100,
  numbering: "auto",
  prefix: "T",
  start: 1,
  direction: "ltr-ttb",
};

function GridGlyph({ cols, rows }: { cols: number; rows: number }) {
  const cell = 9;
  const gap = 1.6;
  return (
    <svg width={cols * cell + (cols - 1) * gap + 2} height={rows * cell + (rows - 1) * gap + 2} aria-hidden>
      {Array.from({ length: cols * rows }, (_, i) => (
        <rect
          key={i}
          x={1 + (i % cols) * (cell + gap)}
          y={1 + Math.floor(i / cols) * (cell + gap)}
          width={cell}
          height={cell}
          rx={2}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
        />
      ))}
    </svg>
  );
}

function nextStartFor(doc: FloorPlanDoc, prefix: string): number {
  const p = prefix.trim().toLowerCase();
  const numbers = doc.tables
    .map((table) => table.number.trim().toLowerCase())
    .filter((number) => number.startsWith(p))
    .map((number) => Number(number.slice(p.length)))
    .filter((n) => Number.isInteger(n) && n >= 0);
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

export function AddTablesStep({
  doc,
  onCancel,
  onCreate,
}: {
  doc: FloorPlanDoc;
  onCancel: () => void;
  onCreate: (options: QuickLayoutOptions) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [allOpen, setAllOpen] = useState(false);
  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  const count = form.preset === "custom" ? form.custom : form.preset;
  const prefix = form.prefix.trim();
  const autoStart = nextStartFor(doc, prefix);
  const start = form.numbering === "auto" ? autoStart : form.start;
  const numbers = useMemo(
    () => allocateTableNumbers(doc.tables.map((table) => table.number), prefix, start, count),
    [doc.tables, prefix, start, count]
  );

  const chipActive = (chip: CategoryChip) =>
    chip === "largeParty" ? form.largePartyOnly : chip === "blocked" ? form.blocked : chip === "smoking" || chip === "nonSmoking" ? form.smoking === chip : form.area === chip;

  function toggleChip(chip: CategoryChip) {
    if (chip === "largeParty") set({ largePartyOnly: !form.largePartyOnly });
    else if (chip === "blocked") set({ blocked: !form.blocked, reservable: form.blocked ? true : false });
    else if (chip === "smoking" || chip === "nonSmoking") set({ smoking: chip });
    else set({ area: chip });
  }

  const categoryText = CHIPS.filter((chip) => chipActive(chip.id))
    .map((chip) => t(`floorPlan.category.${chip.id}`))
    .join(", ");

  const summary: { Icon: ElementType; label: string; value: string }[] = [
    { Icon: TableIcon, label: t("floorPlan.quick.summary.tables"), value: String(count) },
    { Icon: Users, label: t("floorPlan.quick.summary.seats"), value: String(form.seats) },
    { Icon: House, label: t("floorPlan.quick.summary.category"), value: categoryText },
    { Icon: Hash, label: t("floorPlan.quick.summary.numbering"), value: `${numbers.slice(0, 3).join(",")}${count > 3 ? "..." : ""}` },
    { Icon: Shapes, label: t("floorPlan.quick.summary.shape"), value: shapeLabel(form.shape, t) },
    { Icon: Maximize, label: t("floorPlan.quick.summary.size"), value: sizeLabel(form.size, t) },
    { Icon: CalendarCheck, label: t("floorPlan.quick.summary.reservations"), value: form.reservable && !form.blocked ? t("floorPlan.common.allowed") : t("floorPlan.common.notAllowed") },
    { Icon: Footprints, label: t("floorPlan.quick.summary.walkIns"), value: form.walkIn ? t("floorPlan.common.allowed") : t("floorPlan.common.notAllowed") },
  ];

  const invalidCount = !Number.isInteger(count) || count < 1 || count > MAX_QUICK_TABLES;

  function create() {
    if (invalidCount) return;
    const { preset: _preset, custom: _custom, numbering: _numbering, ...defaults } = form;
    onCreate({ ...defaults, count, prefix, start, reservable: form.reservable && !form.blocked });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section className="rounded-[24px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5 sm:p-6">
        <h2 className="text-[17px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.quick.howMany")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.5fr)]">
          {PRESETS.map((preset) => {
            const active = form.preset === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => set({ preset })}
                className={clsx(
                  "flex h-[92px] flex-col items-center justify-center gap-2.5 rounded-xl border px-2 text-[16px] transition-colors",
                  active
                    ? "border-2 border-[#0D6EFD] bg-[#0D6EFD]/[0.06] text-[#0D6EFD]"
                    : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                )}
              >
                {preset === 1 && <img src={FLOOR_PLAN_ASSETS.addOneTable} alt="" className="h-7 w-7 [[data-theme=dark]_&]:invert" />}
                {preset === 10 && <img src={FLOOR_PLAN_ASSETS.addTenTables} alt="" className="h-8 w-auto [[data-theme=dark]_&]:invert" />}
                {preset === 20 && <GridGlyph cols={4} rows={2} />}
                {preset === 50 && <GridGlyph cols={6} rows={2} />}
                <span className="whitespace-nowrap">{t(preset === 1 ? "floorPlan.quick.addOne" : "floorPlan.quick.addN").replace("{n}", String(preset))}</span>
              </button>
            );
          })}
          <div
            className={clsx(
              "col-span-2 flex h-[92px] flex-col items-center justify-center gap-2 rounded-xl border px-3 sm:col-span-1 lg:col-span-1",
              form.preset === "custom" ? "border-2 border-[#0D6EFD] bg-[#0D6EFD]/[0.06]" : "border-[var(--octo-border-input)]"
            )}
            onClick={() => form.preset !== "custom" && set({ preset: "custom" })}
          >
            <span className={clsx("text-[16px]", form.preset === "custom" ? "text-[#0D6EFD]" : "text-[var(--octo-text-primary)]")}>{t("floorPlan.quick.customize")}</span>
            <NumberStepper
              className="h-9 w-full max-w-[220px] rounded-full"
              value={form.custom}
              min={1}
              max={MAX_QUICK_TABLES}
              label={t("floorPlan.quick.customize")}
              suffix={t("floorPlan.quick.tableUnit")}
              onChange={(custom) => set({ custom, preset: "custom" })}
            />
          </div>
        </div>

        <hr className="my-6 border-[var(--octo-border-card)]" />

        <h2 className="text-[17px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.quick.tableSetting")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1.25fr_1fr_1fr]">
          <SelectField<"auto" | "custom">
            label={t("floorPlan.quick.numbering")}
            value={form.numbering}
            onChange={(numbering) => set({ numbering, start: numbering === "custom" ? autoStart : form.start })}
            options={[
              { value: "auto", label: t("floorPlan.quick.numberingAuto"), hint: t("floorPlan.quick.recommended") },
              { value: "custom", label: t("floorPlan.quick.numberingCustom") },
            ]}
          />
          <TextField
            label={t("floorPlan.quick.prefix")}
            hint={t("floorPlan.quick.optional")}
            value={form.prefix}
            maxLength={4}
            placeholder="T"
            onChange={(value) => set({ prefix: value.replace(/[0-9\s]/g, "") })}
          />
          <Field label={t("floorPlan.quick.startNumber")}>
            <div className="relative">
              {prefix && (
                <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--octo-text-muted)]">{prefix}</span>
              )}
              <input
                inputMode="numeric"
                disabled={form.numbering === "auto"}
                value={String(start)}
                aria-label={t("floorPlan.quick.startNumber")}
                onChange={(event) => set({ start: Math.min(9999, Number(event.target.value.replace(/[^0-9]/g, "")) || 0) })}
                className="h-11 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-3.5 text-[14px] text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 disabled:bg-[var(--octo-soft-bg)] disabled:text-[var(--octo-text-secondary)]"
                style={{ paddingInlineStart: prefix ? `${0.875 + prefix.length * 0.6}rem` : "0.875rem" }}
              />
            </div>
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[1.25fr_0.8fr_0.8fr_1fr]">
          <SelectField<NumberingDirection>
            label={t("floorPlan.quick.direction")}
            value={form.direction}
            onChange={(direction) => set({ direction })}
            options={[
              { value: "ltr-ttb", label: t("floorPlan.quick.direction.ltrTtb") },
              { value: "ttb-ltr", label: t("floorPlan.quick.direction.ttbLtr") },
              { value: "rtl-ttb", label: t("floorPlan.quick.direction.rtlTtb") },
            ]}
          />
          <SelectField
            label={t("floorPlan.table.shape")}
            value={form.shape}
            onChange={(shape) => set({ shape })}
            options={TABLE_SHAPES.map((value) => ({ value, label: shapeLabel(value, t) }))}
          />
          <SelectField
            label={t("floorPlan.table.size")}
            value={form.size}
            onChange={(size) => set({ size })}
            options={TABLE_SIZES.map((value) => ({ value, label: sizeLabel(value, t) }))}
          />
          <Field label={t("floorPlan.table.seats")} hint={t("floorPlan.quick.perTable")}>
            <NumberStepper value={form.seats} min={1} max={MAX_SEATS} label={t("floorPlan.table.seats")} onChange={(seats) => set({ seats })} />
          </Field>
        </div>

        <h2 className="mt-7 text-[17px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.quick.category")}</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {CHIPS.map(({ id, Icon }) => {
            const active = chipActive(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleChip(id)}
                className={clsx(
                  "flex h-12 items-center gap-2.5 rounded-[10px] border px-3.5 text-[15px] transition-colors",
                  active
                    ? "border-[#0D6EFD] bg-[#0D6EFD]/[0.06] font-medium text-[#0D6EFD] shadow-[inset_0_0_0_1px_#0D6EFD]"
                    : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                )}
              >
                <Icon size={22} strokeWidth={1.5} />
                {t(`floorPlan.category.${id}`)}
              </button>
            );
          })}
        </div>

        <h2 className="mt-7 text-[17px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.quick.additional")}</h2>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
          <SwitchField
            checked={form.reservable && !form.blocked}
            disabled={form.blocked}
            hint={form.blocked ? t("floorPlan.quick.blockedHint") : undefined}
            onChange={(reservable) => set({ reservable })}
            label={t("floorPlan.quick.allowReservations")}
          />
          <SwitchField checked={form.walkIn} onChange={(walkIn) => set({ walkIn })} label={t("floorPlan.quick.allowWalkIns")} />
          <SwitchField checked={form.joinable} onChange={(joinable) => set({ joinable })} label={t("floorPlan.quick.joinable")} />
          <SwitchField checked={form.visible} onChange={(visible) => set({ visible })} label={t("floorPlan.quick.showOnFloorPlan")} />
        </div>

        <hr className="my-6 border-[var(--octo-border-card)]" />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-14 rounded-[12px] bg-[var(--octo-seg-bg)] px-9 text-[17px] font-semibold text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-track)]"
          >
            {t("floorPlan.common.cancel")}
          </button>
          <button
            type="button"
            onClick={create}
            disabled={invalidCount}
            className="h-14 rounded-[12px] bg-[#0D6EFD] px-10 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[380px]"
          >
            {t(count === 1 ? "floorPlan.quick.createOne" : "floorPlan.quick.create").replace("{n}", String(count))}
          </button>
        </div>
      </section>

      <aside className="flex flex-col gap-5">
        <section className="rounded-[24px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
          <h2 className="text-[18px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.quick.summary.title")}</h2>
          <dl className="mt-3 flex flex-col">
            {summary.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between gap-3 py-[7px]">
                <dt className="flex items-center gap-2 text-[14px] text-[var(--octo-text-secondary)]">
                  <Icon size={18} strokeWidth={1.5} className="shrink-0 text-[var(--octo-text-muted)]" />
                  {label}
                </dt>
                <dd className="truncate text-end text-[15px] text-[var(--octo-text-primary)]" dir={label === summary[3].label ? "ltr" : undefined}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {doc.tables.length > 0 && (
            <p className="mt-3 rounded-xl bg-[var(--octo-soft-bg)] px-3 py-2 text-[12.5px] text-[var(--octo-text-secondary)]">
              {t("floorPlan.quick.addsTo").replace("{name}", doc.name).replace("{n}", String(doc.tables.length))}
            </p>
          )}
        </section>

        <section className="rounded-[24px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.quick.preview")}</h2>
            {count > PREVIEW_LIMIT && (
              <button type="button" onClick={() => setAllOpen(true)} className="text-[16px] font-medium text-[#0D6EFD] hover:underline">
                {t("floorPlan.quick.viewAll")}
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2.5" dir="ltr">
            {numbers.slice(0, count > PREVIEW_LIMIT ? PREVIEW_LIMIT - 1 : PREVIEW_LIMIT).map((number) => (
              <span
                key={number}
                className="grid h-[62px] place-items-center rounded-lg border-2 border-dashed border-[#0D6EFD]/70 bg-[#0D6EFD]/[0.03] text-[16px] font-semibold text-[#0D6EFD]"
              >
                {number}
              </span>
            ))}
            {count > PREVIEW_LIMIT && (
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                className="grid h-[62px] place-items-center rounded-lg border-2 border-dashed border-[var(--octo-border-input)] text-[14px] font-semibold text-[var(--octo-text-secondary)] hover:border-[#0D6EFD] hover:text-[#0D6EFD]"
              >
                +{count - (PREVIEW_LIMIT - 1)}
              </button>
            )}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[var(--octo-selected)] p-3.5">
            <Lightbulb size={24} strokeWidth={1.6} className="shrink-0 text-[#0D6EFD]" />
            <div>
              <p className="text-[15px] font-medium text-[#0D6EFD]">{t("floorPlan.quick.nextTitle")}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--octo-text-secondary)]">{t("floorPlan.quick.nextBody")}</p>
            </div>
          </div>
        </section>
      </aside>

      <Modal open={allOpen} onClose={() => setAllOpen(false)} className="max-w-2xl p-6" title={t("floorPlan.quick.allNumbers").replace("{n}", String(count))}>
        <div className="octo-scroll grid max-h-[60vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-8" dir="ltr">
          {numbers.map((number) => (
            <span key={number} className="grid h-11 place-items-center rounded-lg border border-dashed border-[#0D6EFD]/60 text-[13px] font-semibold text-[#0D6EFD]">
              {number}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-[var(--octo-text-muted)]">
          {seatsLabel(count * form.seats, t)} · {areaLabel(form.area, t)}
        </p>
      </Modal>
    </div>
  );
}
