// Availability — the window an offer runs in.
//
// From/To are the offer's whole run. The optional inner window narrows it to
// certain days and hours within that run, which is why it is a checkbox over
// two more pairs rather than four always-visible fields.
//
// Every field starts empty with the frame's placeholder: a window that arrived
// pre-filled with Sun–Sat 10–12 would be saved without anyone having chosen it.
import type { ReactNode } from "react";
import clsx from "clsx";
import { WEEKDAYS, type Offer, type OfferField, type Weekday } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { CheckBox } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_BORDER, FIELD_INVALID, FOCUS, TEXT, TEXT_SECONDARY } from "../../_shared/theme";
import type { OfferTabValidation } from "./index";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

type Window = NonNullable<Offer["availability"]["window"]>;

const EMPTY_WINDOW: Window = { days: [null, null], start: null, end: null };

const FIELD_CLASS = `h-10 w-full appearance-none rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] pe-10 ps-2 text-[14px] ${FOCUS}`;
const GROUP_TITLE = `text-[14px] font-medium leading-[14px] ${TEXT}`;

function Labelled({ label, error, children }: { label: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-2">
      <span className={clsx("text-[12px] font-medium leading-3", TEXT)}>{label}</span>
      <span className="relative block">{children}</span>
      {error && (
        <span role="alert" className="text-[12px] leading-[14px] text-[#d30202]">
          {error}
        </span>
      )}
    </label>
  );
}

function FieldIcon({ name }: { name: string }) {
  return <MenuIcon name={name} size={24} className={clsx("pointer-events-none absolute end-2 top-1/2 -translate-y-1/2", TEXT)} />;
}

/** A native date input wearing the frame's placeholder. The browser's own
 *  picker indicator is stretched invisibly over the whole field, so a click
 *  anywhere opens the calendar and the drawn icon is only decoration. */
function DateField({
  label,
  placeholder,
  value,
  min,
  error,
  onChange,
  onBlur,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  min?: string;
  error?: string | null;
  onChange: (value: string | null) => void;
  onBlur: () => void;
}) {
  return (
    <Labelled label={label} error={error}>
      <input
        type="date"
        value={value ?? ""}
        min={min}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value || null)}
        onBlur={onBlur}
        className={clsx(
          FIELD_CLASS,
          "relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
          value ? TEXT : "text-transparent",
          error && FIELD_INVALID
        )}
      />
      {!value && (
        <span className={clsx("pointer-events-none absolute inset-y-0 start-2 flex items-center text-[14px] leading-[14px]", TEXT_SECONDARY)}>
          {placeholder}
        </span>
      )}
      <FieldIcon name="menu-calendar.svg" />
    </Labelled>
  );
}

function PickField({
  label,
  placeholder,
  value,
  options,
  icon,
  error,
  onChange,
  onBlur,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  options: { value: string; label: string }[];
  icon: string;
  error?: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <Labelled label={label} error={error}>
      <select
        value={value ?? ""}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={clsx(FIELD_CLASS, value ? TEXT : TEXT_SECONDARY, error && FIELD_INVALID)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldIcon name={icon} />
    </Labelled>
  );
}

export function TabAvailability({
  offer,
  onPatch,
  validation,
}: {
  offer: Offer;
  onPatch: (patch: Partial<Offer>) => void;
  validation: OfferTabValidation;
}) {
  const { t } = useI18n();
  const { errors, onTouch } = validation;
  const { availability } = offer;
  const win = availability.window;
  const message = (field: OfferField) => (errors[field] ? t(errors[field] as string) : null);

  function setWindow(next: Partial<Window>) {
    onPatch({ availability: { ...availability, window: { ...(win ?? EMPTY_WINDOW), ...next } } });
  }

  const dayOptions = WEEKDAYS.map((day) => ({ value: day, label: t(`menuLib.day.${day}`) }));
  const hourOptions = HOURS.map((h) => ({ value: h, label: h }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className={GROUP_TITLE}>{t("menuOffer.available")}</p>
        <DateField
          label={t("menuOffer.from")}
          placeholder={t("menuOffer.startDay")}
          value={availability.from}
          error={message("from")}
          onChange={(from) => onPatch({ availability: { ...availability, from } })}
          onBlur={() => onTouch("from", "to")}
        />
        <DateField
          label={t("menuOffer.to")}
          placeholder={t("menuOffer.endDay")}
          value={availability.to}
          min={availability.from ?? undefined}
          error={message("to")}
          onChange={(to) => onPatch({ availability: { ...availability, to } })}
          onBlur={() => onTouch("to")}
        />
      </div>

      <CheckBox
        checked={win !== null}
        onChange={(next) => (next ? setWindow({}) : onPatch({ availability: { ...availability, window: null } }))}
        label={<span className={win !== null ? "text-[#0D6EFD]" : undefined}>{t("menuOffer.specificWindow")}</span>}
        className="self-start"
      />

      {win && (
        <>
          <div className="flex flex-col gap-3">
            <p className={GROUP_TITLE}>{t("menuOffer.daysSelector")}</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {([0, 1] as const).map((slot) => (
                <PickField
                  key={slot}
                  label={t(slot === 0 ? "menuOffer.from" : "menuOffer.to")}
                  placeholder={t(slot === 0 ? "menuOffer.startDay" : "menuOffer.endDay")}
                  value={win.days[slot]}
                  options={dayOptions}
                  icon="menu-calendar.svg"
                  error={message(slot === 0 ? "dayFrom" : "dayTo")}
                  onBlur={() => onTouch(slot === 0 ? "dayFrom" : "dayTo")}
                  onChange={(value) => {
                    const days: Window["days"] = [...win.days];
                    days[slot] = value as Weekday;
                    setWindow({ days });
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className={GROUP_TITLE}>{t("menuOffer.timeSelector")}</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <PickField
                label={t("menuOffer.from")}
                placeholder={t("menuOffer.startTime")}
                value={win.start}
                options={hourOptions}
                icon="menu-clock.svg"
                error={message("timeFrom")}
                onBlur={() => onTouch("timeFrom")}
                onChange={(start) => setWindow({ start })}
              />
              <PickField
                label={t("menuOffer.to")}
                placeholder={t("menuOffer.endTime")}
                value={win.end}
                options={hourOptions}
                icon="menu-clock.svg"
                error={message("timeTo")}
                onBlur={() => onTouch("timeTo")}
                onChange={(end) => setWindow({ end })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
