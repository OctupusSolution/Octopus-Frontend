// Quick Box Layout, step 1: how many tables, how they are numbered, and the
// settings every one of them starts with. The summary and preview on the
// right show the exact numbers that will be created — skipping any the plan
// already uses — so "Create 15 Tables" never surprises anyone.
import { useMemo, useState } from "react";
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
import { ShellIcon } from "@/shared/ui/shell-icon";
import {
  BORDER_300,
  SURFACE_BRAND_LIGHT,
  SURFACE_INFO,
  SURFACE_WHITE,
  TEXT_BRAND,
  TEXT_BRAND_DEEP,
  TEXT_PRIMARY,
  TEXT_SEC_GRAY,
  TEXT_SECONDARY,
} from "../../../_shared/theme";
import { Field, NumberStepper, SelectField, TextField } from "../../_shared/fields";
import { areaLabel, seatsLabel, shapeLabel, sizeLabel } from "../../_shared/labels";
import { SwitchField } from "../../_shared/switch";

type Preset = 1 | 10 | 20 | 50 | "custom";
const PRESETS: Exclude<Preset, "custom">[] = [1, 10, 20, 50];
const PREVIEW_LIMIT = 15;

type CategoryChip = "indoor" | "outdoor" | "smoking" | "nonSmoking" | "vip" | "regular" | "largeParty" | "blocked";
const CHIPS: { id: CategoryChip; icon: string }[] = [
  { id: "indoor", icon: "fp-quick-cat-indoor.svg" },
  { id: "outdoor", icon: "fp-quick-cat-outdoor.svg" },
  { id: "smoking", icon: "fp-quick-cat-smoking.svg" },
  { id: "nonSmoking", icon: "fp-quick-cat-non-smoking.svg" },
  { id: "vip", icon: "fp-quick-cat-vip.svg" },
  { id: "regular", icon: "fp-quick-cat-regular.svg" },
  { id: "largeParty", icon: "fp-quick-cat-large-party.svg" },
  { id: "blocked", icon: "fp-quick-cat-blocked.svg" },
];

const CARD = clsx("rounded-[24px] border p-4", BORDER_300, SURFACE_WHITE);
const HEADING = clsx("text-[16px] font-medium leading-[16px]", TEXT_PRIMARY);
const SELECTED = clsx("border-[#0d6efd]", SURFACE_BRAND_LIGHT, TEXT_BRAND);
const BG_GRAY_200 = "bg-[#e2e8f0] [[data-theme=dark]_&]:bg-[var(--octo-track)]";

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

const CELL = "box-border h-3 w-3 rounded-[2px] border border-current";

/** The frames' "many tables" marks: 12px outlined cells packed edge to edge,
 *  two rows deep. Ten is the odd one out — four cells around a tall middle one. */
function GridGlyph({ cols }: { cols: number }) {
  return (
    <span aria-hidden className="grid grid-rows-2" style={{ gridTemplateColumns: `repeat(${cols}, 12px)` }}>
      {Array.from({ length: cols * 2 }, (_, i) => (
        <span key={i} className={CELL} />
      ))}
    </span>
  );
}

function TenGlyph() {
  return (
    <span aria-hidden className="flex h-6">
      <span className="flex flex-col">
        <span className={CELL} />
        <span className={CELL} />
      </span>
      <span className="-mx-px box-border h-6 w-[11px] rounded-[2px] border border-current" />
      <span className="flex flex-col">
        <span className={CELL} />
        <span className={CELL} />
      </span>
    </span>
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

  const summary: { icon: string; size: number; label: string; value: string; ltr?: boolean }[] = [
    { icon: "fp-quick-sum-tables.svg", size: 14, label: t("floorPlan.quick.summary.tables"), value: String(count) },
    { icon: "fp-quick-sum-seats.svg", size: 16, label: t("floorPlan.quick.summary.seats"), value: String(form.seats) },
    { icon: "fp-quick-sum-category.svg", size: 16, label: t("floorPlan.quick.summary.category"), value: categoryText },
    { icon: "fp-quick-sum-numbering.svg", size: 16, label: t("floorPlan.quick.summary.numbering"), value: `${numbers.slice(0, 3).join(",")}${count > 3 ? "..." : ""}`, ltr: true },
    { icon: "fp-quick-sum-shape.svg", size: 15, label: t("floorPlan.quick.summary.shape"), value: shapeLabel(form.shape, t) },
    { icon: "fp-quick-sum-size.svg", size: 16, label: t("floorPlan.quick.summary.size"), value: sizeLabel(form.size, t) },
    { icon: "fp-quick-sum-reservations.svg", size: 14, label: t("floorPlan.quick.summary.reservations"), value: form.reservable && !form.blocked ? t("floorPlan.common.allowed") : t("floorPlan.common.notAllowed") },
    { icon: "fp-quick-sum-walk-ins.svg", size: 16, label: t("floorPlan.quick.summary.walkIns"), value: form.walkIn ? t("floorPlan.common.allowed") : t("floorPlan.common.notAllowed") },
  ];

  const invalidCount = !Number.isInteger(count) || count < 1 || count > MAX_QUICK_TABLES;

  function create() {
    if (invalidCount) return;
    const { preset: _preset, custom: _custom, numbering: _numbering, ...defaults } = form;
    onCreate({ ...defaults, count, prefix, start, reservable: form.reservable && !form.blocked });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,757fr)_minmax(0,367fr)]">
      <section className={clsx(CARD, "flex min-w-0 flex-col gap-6")}>
        <div className={clsx("flex flex-col gap-4 border-b pb-3", BORDER_300)}>
          <h2 className={HEADING}>{t("floorPlan.quick.howMany")}</h2>
          <div className="flex flex-wrap items-stretch justify-between gap-3">
            {PRESETS.map((preset) => {
              const active = form.preset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ preset })}
                  className={clsx(
                    "flex h-[70px] shrink-0 flex-col items-center justify-center gap-3 rounded-[8px] border p-2 text-[16px] font-medium leading-[16px] transition-colors",
                    active ? SELECTED : clsx(BORDER_300, TEXT_PRIMARY, "hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]")
                  )}
                >
                  {preset === 1 && <ShellIcon name="fp-quick-one-table.svg" size={20} />}
                  {preset === 10 && <TenGlyph />}
                  {preset === 20 && <GridGlyph cols={4} />}
                  {preset === 50 && <GridGlyph cols={6} />}
                  <span className="whitespace-nowrap">{t(preset === 1 ? "floorPlan.quick.addOne" : "floorPlan.quick.addN").replace("{n}", String(preset))}</span>
                </button>
              );
            })}
            <div
              className={clsx(
                "flex h-[70px] min-w-[185px] flex-1 flex-col items-center justify-center gap-1 rounded-[8px] border p-2 sm:flex-none",
                form.preset === "custom" ? clsx("border-[#0d6efd]", SURFACE_BRAND_LIGHT) : BORDER_300
              )}
              onClick={() => form.preset !== "custom" && set({ preset: "custom" })}
            >
              <span className={clsx("text-[16px] font-medium leading-[16px]", form.preset === "custom" ? TEXT_BRAND : TEXT_PRIMARY)}>{t("floorPlan.quick.customize")}</span>
              <NumberStepper
                className="!h-8 w-full !rounded-[24px]"
                value={form.custom}
                min={1}
                max={MAX_QUICK_TABLES}
                label={t("floorPlan.quick.customize")}
                suffix={t("floorPlan.quick.tableUnit")}
                onChange={(custom) => set({ custom, preset: "custom" })}
              />
            </div>
          </div>
        </div>

        <div className={clsx("flex flex-col gap-6 border-b pb-3", BORDER_300)}>
          <h2 className={HEADING}>{t("floorPlan.quick.tableSetting")}</h2>
          <div className="grid grid-cols-1 gap-x-3 gap-y-6 md:grid-cols-[273fr_209fr_219fr]">
            <SelectField<"auto" | "custom">
              muted
              label={t("floorPlan.quick.numbering")}
              value={form.numbering}
              onChange={(numbering) => set({ numbering, start: numbering === "custom" ? autoStart : form.start })}
              options={[
                { value: "auto", label: t("floorPlan.quick.numberingAuto"), hint: t("floorPlan.quick.recommended") },
                { value: "custom", label: t("floorPlan.quick.numberingCustom") },
              ]}
            />
            <TextField
              muted
              label={t("floorPlan.quick.prefix")}
              hint={t("floorPlan.quick.optional")}
              value={form.prefix}
              maxLength={4}
              placeholder="T"
              onChange={(value) => set({ prefix: value.replace(/[0-9\s]/g, "") })}
            />
            <Field label={t("floorPlan.quick.startNumber")}>
              <div className="relative">
                {prefix && <span className={clsx("pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-[14px] leading-[14px]", TEXT_SECONDARY)}>{prefix}</span>}
                <input
                  inputMode="numeric"
                  disabled={form.numbering === "auto"}
                  value={String(start)}
                  aria-label={t("floorPlan.quick.startNumber")}
                  onChange={(event) => set({ start: Math.min(9999, Number(event.target.value.replace(/[^0-9]/g, "")) || 0) })}
                  className={clsx(
                    "h-10 w-full rounded-[12px] border pe-2 text-[14px] focus:border-[#0d6efd] focus:outline-none focus:ring-2 focus:ring-[#0d6efd]/25 disabled:cursor-not-allowed",
                    BORDER_300,
                    SURFACE_WHITE,
                    TEXT_SECONDARY
                  )}
                  style={{ paddingInlineStart: prefix ? `calc(0.5rem + ${prefix.length}ch)` : "0.5rem" }}
                />
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-[273fr_150fr_150fr_209fr]">
            <SelectField<NumberingDirection>
              muted
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
              muted
              label={t("floorPlan.table.shape")}
              value={form.shape}
              onChange={(shape) => set({ shape })}
              options={TABLE_SHAPES.map((value) => ({ value, label: shapeLabel(value, t) }))}
            />
            <SelectField
              muted
              label={t("floorPlan.table.size")}
              value={form.size}
              onChange={(size) => set({ size })}
              options={TABLE_SIZES.map((value) => ({ value, label: sizeLabel(value, t) }))}
            />
            <Field label={t("floorPlan.table.seats")} hint={t("floorPlan.quick.perTable")}>
              <NumberStepper
                className="!h-8 !rounded-[24px]"
                value={form.seats}
                min={1}
                max={MAX_SEATS}
                label={t("floorPlan.table.seats")}
                onChange={(seats) => set({ seats })}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={HEADING}>{t("floorPlan.quick.category")}</h2>
            <div className="flex flex-wrap gap-x-2 gap-y-3">
              {CHIPS.map(({ id, icon }) => {
                const active = chipActive(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleChip(id)}
                    className={clsx(
                      "flex h-10 items-center gap-2 rounded-[12px] border p-2 text-[14px] font-semibold leading-[14px] transition-colors",
                      active ? SELECTED : clsx(BORDER_300, TEXT_SECONDARY, "hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]")
                    )}
                  >
                    <ShellIcon name={icon} size={24} />
                    <span className="whitespace-nowrap">{t(`floorPlan.category.${id}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={HEADING}>{t("floorPlan.quick.additional")}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <SwitchField
                weight="semibold"
                checked={form.reservable && !form.blocked}
                disabled={form.blocked}
                hint={form.blocked ? t("floorPlan.quick.blockedHint") : undefined}
                onChange={(reservable) => set({ reservable })}
                label={t("floorPlan.quick.allowReservations")}
              />
              <SwitchField weight="semibold" checked={form.walkIn} onChange={(walkIn) => set({ walkIn })} label={t("floorPlan.quick.allowWalkIns")} />
              <SwitchField weight="semibold" checked={form.joinable} onChange={(joinable) => set({ joinable })} label={t("floorPlan.quick.joinable")} />
              <SwitchField weight="semibold" checked={form.visible} onChange={(visible) => set({ visible })} label={t("floorPlan.quick.showOnFloorPlan")} />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={clsx(
              "h-12 rounded-[8px] px-3 py-2 text-[18px] font-bold leading-[18px] transition-opacity hover:opacity-80 sm:w-[108px]",
              BG_GRAY_200,
              TEXT_SECONDARY
            )}
          >
            {t("floorPlan.common.cancel")}
          </button>
          <button
            type="button"
            onClick={create}
            disabled={invalidCount}
            className="h-12 rounded-[8px] bg-[#0d6efd] px-3 py-2 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[301px]"
          >
            {t(count === 1 ? "floorPlan.quick.createOne" : "floorPlan.quick.create").replace("{n}", String(count))}
          </button>
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-4">
        <section className={clsx(CARD, "flex flex-col gap-4")}>
          <h2 className={HEADING}>{t("floorPlan.quick.summary.title")}</h2>
          <dl className="flex flex-col gap-4">
            {summary.map(({ icon, size, label, value, ltr }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className={clsx("flex shrink-0 items-center gap-1 text-[12px] font-medium leading-[12px]", TEXT_SECONDARY)}>
                  <span className="grid h-4 w-4 shrink-0 place-items-center">
                    <ShellIcon name={icon} size={size} />
                  </span>
                  {label}
                </dt>
                <dd className={clsx("min-w-0 truncate text-end text-[14px] font-medium leading-[14px]", TEXT_PRIMARY)} dir={ltr ? "ltr" : undefined}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {doc.tables.length > 0 && (
            <p className={clsx("rounded-[8px] p-2 text-[12px] leading-[1.3]", SURFACE_INFO, TEXT_SEC_GRAY)}>
              {t("floorPlan.quick.addsTo").replace("{name}", doc.name).replace("{n}", String(doc.tables.length))}
            </p>
          )}
        </section>

        <section className={clsx(CARD, "flex flex-col gap-3")}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 text-[16px] leading-[16px]">
              <h2 className={clsx("font-medium", TEXT_PRIMARY)}>{t("floorPlan.quick.preview")}</h2>
              {count > PREVIEW_LIMIT && (
                <button type="button" onClick={() => setAllOpen(true)} className={clsx("font-bold hover:underline", TEXT_BRAND)}>
                  {t("floorPlan.quick.viewAll")}
                </button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-3" dir="ltr">
              {numbers.slice(0, count > PREVIEW_LIMIT ? PREVIEW_LIMIT - 1 : PREVIEW_LIMIT).map((number) => (
                <span
                  key={number}
                  className={clsx(
                    "grid h-[57px] min-w-0 place-items-center truncate rounded-[8px] border border-dashed border-[#0d6efd] text-[16px] font-bold leading-[16px]",
                    SURFACE_BRAND_LIGHT,
                    TEXT_BRAND
                  )}
                >
                  {number}
                </span>
              ))}
              {count > PREVIEW_LIMIT && (
                <button
                  type="button"
                  onClick={() => setAllOpen(true)}
                  className={clsx(
                    "grid h-[57px] min-w-0 place-items-center rounded-[8px] border border-dashed text-[16px] font-bold leading-[16px] hover:border-[#0d6efd] hover:text-[#0d6efd]",
                    BORDER_300,
                    TEXT_SECONDARY
                  )}
                >
                  +{count - (PREVIEW_LIMIT - 1)}
                </button>
              )}
            </div>
          </div>
          <div className={clsx("flex items-start gap-2 rounded-[8px] p-2", SURFACE_INFO)}>
            <ShellIcon name="fp-quick-light-bulb.svg" size={24} className={TEXT_BRAND_DEEP} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className={clsx("text-[14px] font-semibold leading-[14px]", TEXT_BRAND_DEEP)}>{t("floorPlan.quick.nextTitle")}</p>
              <p className={clsx("text-[12px] leading-[1.3]", TEXT_SEC_GRAY)}>{t("floorPlan.quick.nextBody")}</p>
            </div>
          </div>
        </section>
      </aside>

      <Modal open={allOpen} onClose={() => setAllOpen(false)} className="max-w-2xl p-6" title={t("floorPlan.quick.allNumbers").replace("{n}", String(count))}>
        <div className="octo-scroll grid max-h-[60vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-8" dir="ltr">
          {numbers.map((number) => (
            <span
              key={number}
              className={clsx("grid h-11 place-items-center rounded-[8px] border border-dashed border-[#0d6efd] text-[13px] font-bold", SURFACE_BRAND_LIGHT, TEXT_BRAND)}
            >
              {number}
            </span>
          ))}
        </div>
        <p className={clsx("mt-3 text-[12px]", TEXT_SEC_GRAY)}>
          {seatsLabel(count * form.seats, t)} · {areaLabel(form.area, t)}
        </p>
      </Modal>
    </div>
  );
}
