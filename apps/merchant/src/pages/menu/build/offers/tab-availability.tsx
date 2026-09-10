// Availability — the window an offer runs in.
//
// From/To are the offer's whole run. The optional inner window narrows it to
// certain days and hours within that run, which is why it is a checkbox over
// two more pairs rather than four always-visible fields.
import { Checkbox, Select } from "@ui/primitives";
import { WEEKDAYS, type Offer, type Weekday } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

const dateClass =
  "mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]";

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

  function setWindow(next: Partial<NonNullable<Offer["availability"]["window"]>>) {
    const base = win ?? { days: ["sun", "sat"] as [Weekday, Weekday], start: "10:00", end: "12:00" };
    onPatch({ availability: { ...availability, window: { ...base, ...next } } });
  }

  return (
    <div className="max-w-[720px] space-y-4">
      <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
        {t("menuOffer.available")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuOffer.from")}
          </span>
          <input
            type="date"
            value={availability.from ?? ""}
            onChange={(e) =>
              onPatch({ availability: { ...availability, from: e.target.value || null } })
            }
            className={dateClass}
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuOffer.to")}
          </span>
          <input
            type="date"
            value={availability.to ?? ""}
            onChange={(e) =>
              onPatch({ availability: { ...availability, to: e.target.value || null } })
            }
            className={dateClass}
          />
        </label>
      </div>

      <label className="flex items-center gap-2.5 text-[14px]">
        <Checkbox
          checked={win !== null}
          onChange={() =>
            win === null
              ? setWindow({})
              : onPatch({ availability: { ...availability, window: null } })
          }
        />
        <span className="font-medium text-[var(--octo-accent)]">
          {t("menuOffer.specificWindow")}
        </span>
      </label>

      {win && (
        <>
          <div>
            <p className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
              {t("menuOffer.daysSelector")}
            </p>
            <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
              {([0, 1] as const).map((slot) => (
                <label key={slot} className="block">
                  <span className="text-[13px] text-[var(--octo-text-secondary)]">
                    {t(slot === 0 ? "menuOffer.from" : "menuOffer.to")}
                  </span>
                  <Select
                    className="mt-1"
                    value={win.days[slot]}
                    onChange={(e) => {
                      const days: [Weekday, Weekday] = [...win.days];
                      days[slot] = e.target.value as Weekday;
                      setWindow({ days });
                    }}
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day} value={day}>
                        {t(`menuLib.day.${day}`)}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
              {t("menuOffer.timeSelector")}
            </p>
            <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13px] text-[var(--octo-text-secondary)]">
                  {t("menuOffer.from")}
                </span>
                <Select
                  className="mt-1"
                  value={win.start}
                  onChange={(e) => setWindow({ start: e.target.value })}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="text-[13px] text-[var(--octo-text-secondary)]">
                  {t("menuOffer.to")}
                </span>
                <Select
                  className="mt-1"
                  value={win.end}
                  onChange={(e) => setWindow({ end: e.target.value })}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </Select>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
