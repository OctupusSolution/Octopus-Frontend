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
import { CalendarDays, Clock } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { WEEKDAYS, type Offer, type Weekday } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

type Window = NonNullable<Offer["availability"]["window"]>;

const EMPTY_WINDOW: Window = { days: [null, null], start: null, end: null };

const fieldClass =
  "h-[50px] w-full appearance-none rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] ps-3 pe-11 text-[15px] text-[var(--octo-text-primary)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[14px] text-[var(--octo-text-primary)]">{label}</span>
      <span className="relative mt-1.5 block">{children}</span>
    </label>
  );
}

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-[var(--octo-text-primary)]"
    >
      {children}
    </span>
  );
}

/** A native date input wearing the frame's placeholder. The browser's own
 *  picker indicator is stretched invisibly over the whole field, so a click
 *  anywhere opens the calendar and the drawn icon is only decoration. */
function DateField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={clsx(
          fieldClass,
          "relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
          !value && "text-transparent"
        )}
      />
      {!value && (
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[15px] text-[var(--octo-text-muted)]">
          {placeholder}
        </span>
      )}
      <FieldIcon>
        <CalendarDays size={20} />
      </FieldIcon>
    </Field>
  );
}

function PickField({
  label,
  placeholder,
  value,
  options,
  icon,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  options: { value: string; label: string }[];
  icon: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(fieldClass, !value && "text-[var(--octo-text-muted)]")}
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
      <FieldIcon>{icon}</FieldIcon>
    </Field>
  );
}

export function TabAvailability({
  offer,
  onPatch,
}: {
  offer: Offer;
  onPatch: (patch: Partial<Offer>) => void;
}) {
  const { t } = useI18n();
  const { availability } = offer;
  const win = availability.window;

  function setWindow(next: Partial<Window>) {
    onPatch({ availability: { ...availability, window: { ...(win ?? EMPTY_WINDOW), ...next } } });
  }

  const dayOptions = WEEKDAYS.map((day) => ({ value: day, label: t(`menuLib.day.${day}`) }));
  const hourOptions = HOURS.map((h) => ({ value: h, label: h }));

  return (
    <div className="space-y-4">
      <p className="text-[16px] font-medium text-[var(--octo-text-primary)]">
        {t("menuOffer.available")}
      </p>

      <DateField
        label={t("menuOffer.from")}
        placeholder={t("menuOffer.startDay")}
        value={availability.from}
        onChange={(from) => onPatch({ availability: { ...availability, from } })}
      />
      <DateField
        label={t("menuOffer.to")}
        placeholder={t("menuOffer.endDay")}
        value={availability.to}
        onChange={(to) => onPatch({ availability: { ...availability, to } })}
      />

      <label className="flex items-center gap-2.5">
        <Checkbox
          className="[&_input]:h-5 [&_input]:w-5 [&>span]:h-5 [&>span]:w-5"
          checked={win !== null}
          onChange={() =>
            win === null
              ? setWindow({})
              : onPatch({ availability: { ...availability, window: null } })
          }
        />
        <span className="text-[15px] font-medium text-[var(--octo-accent)]">
          {t("menuOffer.specificWindow")}
        </span>
      </label>

      {win && (
        <>
          <div>
            <p className="text-[16px] font-medium text-[var(--octo-text-primary)]">
              {t("menuOffer.daysSelector")}
            </p>
            <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
              {([0, 1] as const).map((slot) => (
                <PickField
                  key={slot}
                  label={t(slot === 0 ? "menuOffer.from" : "menuOffer.to")}
                  placeholder={t(slot === 0 ? "menuOffer.startDay" : "menuOffer.endDay")}
                  value={win.days[slot]}
                  options={dayOptions}
                  icon={<CalendarDays size={20} />}
                  onChange={(value) => {
                    const days: Window["days"] = [...win.days];
                    days[slot] = value as Weekday;
                    setWindow({ days });
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[16px] font-medium text-[var(--octo-text-primary)]">
              {t("menuOffer.timeSelector")}
            </p>
            <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
              <PickField
                label={t("menuOffer.from")}
                placeholder={t("menuOffer.startTime")}
                value={win.start}
                options={hourOptions}
                icon={<Clock size={20} />}
                onChange={(start) => setWindow({ start })}
              />
              <PickField
                label={t("menuOffer.to")}
                placeholder={t("menuOffer.endTime")}
                value={win.end}
                options={hourOptions}
                icon={<Clock size={20} />}
                onChange={(end) => setWindow({ end })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
