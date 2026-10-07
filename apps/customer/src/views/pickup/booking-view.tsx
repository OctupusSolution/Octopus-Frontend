"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { Branch } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { usePickupCheckout } from "@/features/pickup/checkout";
import {
  BOOKABLE_TABLES, BOOKING_DEPOSIT_SAR, BOOKING_TIMES, CONTACT_METHODS, hasFreeTables, localDateKey,
  OCCASIONS, quoteWaitlist, ZONES, type OccasionId, type WaitlistQuote, type ZoneId,
} from "@/shared/api/mock-reservations";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { PICKUP_ROUTES } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton, TableIcon, TableModal, TableSheet } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import {
  BookingNotice, BookingSection, ChoiceRow, DateField, FieldLabel, formatBookingDate, formatBookingTime,
  GuestsField, isValidPhone, PhoneField, SelectField, TextField, TimeField,
} from "./booking-parts";

export interface PickupBookingViewProps {
  branches: Branch[];
}

type SectionId = "details" | "table" | "occasion";
type ZoneFilter = ZoneId | "all";

const ZONE_ON = "border-ocean-blue bg-[var(--octo-store-select-soft)] text-[var(--octo-store-select-text)]";
const ZONE_OFF = "border-gray-300 text-gray-900";

// The floor plan's squared paper: 25 by 24 cells, the first column cut short.
const FLOOR_GRID = {
  backgroundImage:
    "linear-gradient(to right, var(--color-gray-200) 1px, transparent 1px), linear-gradient(to bottom, var(--color-gray-200) 1px, transparent 1px)",
  backgroundSize: "25px 24px",
  backgroundPosition: "16px -1px",
} as const;

interface TablePickerProps {
  zone: ZoneFilter;
  onZone: (zone: ZoneFilter) => void;
  tableId: string | null;
  onTable: (tableId: string) => void;
}

function TablePicker({ zone, onZone, tableId, onTable }: TablePickerProps) {
  const { t } = useI18n();
  const tables = BOOKABLE_TABLES.filter((table) => zone === "all" || table.zones.includes(zone));
  const chip = "flex h-10 shrink-0 items-center rounded-[12px] border p-2 text-[14px] leading-none";

  return (
    <>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {zone !== "all" && (
          <button
            type="button"
            aria-label={t("store.table.filterReset")}
            onClick={() => onZone("all")}
            className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-ocean-blue"
          >
            <TableIcon name="reload-white" />
          </button>
        )}
        <button
          type="button"
          aria-pressed={zone === "all"}
          onClick={() => onZone("all")}
          className={`${chip} ${zone === "all" ? ZONE_ON : ZONE_OFF}`}
        >
          {t("store.booking.zone.all")}
        </button>
        {ZONES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={zone === id}
            onClick={() => onZone(id)}
            className={`${chip} ${zone === id ? ZONE_ON : ZONE_OFF}`}
          >
            {t(`store.booking.zone.${id}`)}
          </button>
        ))}
      </div>

      <div
        role="radiogroup"
        aria-label={t("store.booking.chooseTable")}
        className="grid h-[336px] grid-cols-[repeat(5,48px)] content-start justify-between gap-y-4 border border-gray-200 bg-gray-50 p-4"
        style={FLOOR_GRID}
      >
        {tables.map((table) => {
          const selected = table.id === tableId;
          return (
            <button
              key={table.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onTable(table.id)}
              className={`flex size-12 items-center justify-center rounded-[8px] text-[12px] font-bold leading-[12px] [font-family:var(--font-latin)] ${
                selected
                  ? "bg-[var(--octo-store-success)] text-white"
                  : "border-2 border-dashed border-[var(--octo-store-success)] bg-[var(--octo-store-table-free)] text-[var(--octo-store-success)]"
              }`}
            >
              {table.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

function SummaryRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-[20px] bg-white p-3">
      <span className="flex size-6 shrink-0 items-center justify-center">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 font-medium leading-none">
        <p className="text-[12px] text-[var(--octo-store-select-label)]">{label}</p>
        {children}
      </div>
    </div>
  );
}

const SUMMARY_VALUE = "tbl-wrap-safe text-[14px] text-gray-900";

interface WaitlistSheetProps {
  open: boolean;
  onClose: () => void;
  guests: number;
  date: string;
  time: string;
  today: string;
  onConfirm: (quote: WaitlistQuote) => void;
}

function WaitlistSheet({ open, onClose, guests, date, time, today, onConfirm }: WaitlistSheetProps) {
  const { t } = useI18n();
  const [party, setParty] = useState(guests);
  const [area, setArea] = useState("");
  const [day, setDay] = useState(date);
  const [slot, setSlot] = useState(time);
  const [contact, setContact] = useState("");
  const [attempted, setAttempted] = useState(false);

  const complete = party > 0 && area !== "" && day !== "" && slot !== "" && contact !== "";

  function confirm() {
    setAttempted(true);
    // There is no waitlist endpoint yet, so the place in the queue is quoted, not held.
    if (complete) onConfirm(quoteWaitlist(party));
  }

  return (
    <TableSheet open={open} onClose={onClose} dim label={t("store.booking.joinWaitlist")}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <h2 className="text-[18px] font-bold leading-none text-gray-900">{t("store.booking.joinWaitlist")}</h2>

          <div className="flex flex-col gap-4">
            <GuestsField
              label={t("store.booking.guests")}
              placeholder={t("store.booking.guestsPlaceholder")}
              value={party}
              onChange={setParty}
              invalid={attempted && party <= 0}
            />
            <SelectField
              label={t("store.booking.preferredArea")}
              placeholder={t("store.booking.preferredAreaPlaceholder")}
              value={area}
              onChange={setArea}
              options={ZONES.map((id) => ({ value: id, label: t(`store.booking.zone.${id}`) }))}
              invalid={attempted && area === ""}
            />
            <DateField
              label={t("store.booking.day")}
              placeholder={t("store.booking.dayPlaceholder")}
              value={day}
              min={today}
              onChange={setDay}
              invalid={attempted && day === ""}
            />
            <SelectField
              label={t("store.booking.time")}
              placeholder={t("store.booking.timePlaceholder")}
              value={slot}
              onChange={setSlot}
              options={BOOKING_TIMES.map((value) => ({ value, label: formatBookingTime(value, t) }))}
              invalid={attempted && slot === ""}
            />
            <SelectField
              label={t("store.booking.contactMethod")}
              placeholder={t("store.booking.contactMethodPlaceholder")}
              value={contact}
              onChange={setContact}
              options={CONTACT_METHODS.map((id) => ({ value: id, label: t(`store.booking.contact.${id}`) }))}
              invalid={attempted && contact === ""}
            />
          </div>
        </div>

        <TableButton size="lg" onClick={confirm}>
          {t("store.booking.confirmJoin")}
        </TableButton>
      </div>
    </TableSheet>
  );
}

/** Book a table: who and when, which table, the occasion — then the deposit
 *  that confirms it. A day with no table left offers the waitlist instead. */
export function PickupBookingView({ branches }: PickupBookingViewProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const flow = useMobileFlow();
  const { setReservation } = usePickupCheckout();

  const [open, setOpen] = useState<Record<SectionId, boolean>>({ details: false, table: false, occasion: false });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(0);
  const [time, setTime] = useState("");
  const [zone, setZone] = useState<ZoneFilter>("all");
  const [tableId, setTableId] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<OccasionId>("none");
  const [note, setNote] = useState("");
  // Joining the waitlist only needs to know who to reach; paying the deposit needs every answer.
  const [attempted, setAttempted] = useState<"none" | "contact" | "all">("none");
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [quote, setQuote] = useState<WaitlistQuote | null>(null);

  const today = localDateKey(new Date());
  const full = date !== "" && !hasFreeTables(date, today);
  const table = BOOKABLE_TABLES.find((candidate) => candidate.id === tableId) ?? null;
  const branch = branches.find((candidate) => candidate.id === branchId) ?? null;
  const toggle = (id: SectionId) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const invalid = {
    name: name.trim().length < 2,
    phone: !isValidPhone(phone),
    branch: branch === null,
    date: date === "",
    guests: guests <= 0,
    time: time === "",
  };
  const detailsValid = !Object.values(invalid).some(Boolean);
  const flag = (field: keyof typeof invalid): boolean =>
    invalid[field] &&
    (attempted === "all" || (attempted === "contact" && (field === "name" || field === "phone" || field === "branch")));

  function payDeposit() {
    setAttempted("all");
    if (!detailsValid || !table || !branch) {
      // The fields that still need an answer are in the first section.
      if (!detailsValid) setOpen((prev) => ({ ...prev, details: true }));
      return;
    }
    setReservation({
      number: null,
      name: name.trim(),
      phone: phone.replace(/\D/g, ""),
      branchName: branch.displayName,
      date,
      time,
      guests,
      tableLabel: table.label,
      zoneKey: `store.booking.zone.${table.zones[0]}`,
      occasionKey: `store.booking.occasion.${occasion}`,
      note: note.trim(),
      depositSar: BOOKING_DEPOSIT_SAR,
      payment: null,
    });
    router.push(PICKUP_ROUTES.bookingPay);
  }

  function openWaitlist() {
    setAttempted((prev) => (prev === "all" ? prev : "contact"));
    if (invalid.name || invalid.phone || invalid.branch) return;
    setWaitlistOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          <div className="px-4">
            <TableBackTitle title={t("store.booking.title")} backHref={flow.home} backLabel={t("store.table.back")} />
          </div>

          <div className="flex flex-col gap-4 px-4">
            <BookingSection title={t("store.booking.details")} open={open.details} onToggle={() => toggle("details")}>
              <div className="flex flex-col gap-4">
                <TextField
                  label={t("store.booking.name")}
                  placeholder={t("store.booking.namePlaceholder")}
                  value={name}
                  onChange={setName}
                  invalid={flag("name")}
                  autoComplete="name"
                />
                <PhoneField label={t("store.booking.phone")} value={phone} onChange={setPhone} invalid={flag("phone")} />
                <SelectField
                  label={t("store.booking.branch")}
                  placeholder={t("store.booking.branchPlaceholder")}
                  value={branchId}
                  onChange={setBranchId}
                  options={branches.map((candidate) => ({ value: candidate.id, label: candidate.displayName }))}
                  invalid={flag("branch")}
                />
                <DateField
                  label={t("store.booking.day")}
                  placeholder={t("store.booking.dayPlaceholder")}
                  value={date}
                  min={today}
                  onChange={setDate}
                  invalid={flag("date")}
                />
                <GuestsField
                  label={t("store.booking.guests")}
                  placeholder={t("store.booking.guestsPlaceholder")}
                  value={guests}
                  onChange={setGuests}
                  invalid={flag("guests")}
                />
                <TimeField
                  label={t("store.booking.time")}
                  placeholder={t("store.booking.timePlaceholder")}
                  value={time}
                  onChange={setTime}
                  invalid={flag("time")}
                />

                {full && (
                  <>
                    <BookingNotice title={t("store.booking.noTablesTitle")}>
                      {t("store.booking.noTablesBody")}
                    </BookingNotice>
                    <TableButton onClick={openWaitlist}>{t("store.booking.joinWaitlist")}</TableButton>
                  </>
                )}
              </div>
            </BookingSection>

            {!full && (
              <>
                <BookingSection
                  title={t("store.booking.chooseTable")}
                  open={open.table}
                  onToggle={() => toggle("table")}
                >
                  <TablePicker zone={zone} onZone={setZone} tableId={tableId} onTable={setTableId} />
                </BookingSection>

                <BookingSection
                  title={t("store.booking.occasionTitle")}
                  open={open.occasion}
                  onToggle={() => toggle("occasion")}
                >
                  <div role="radiogroup" aria-label={t("store.booking.occasionTitle")} className="flex flex-col gap-3">
                    {OCCASIONS.map((id) => (
                      <ChoiceRow
                        key={id}
                        label={t(`store.booking.occasion.${id}`)}
                        selected={occasion === id}
                        onSelect={() => setOccasion(id)}
                      />
                    ))}
                  </div>
                </BookingSection>

                <label className="flex flex-col gap-3">
                  <FieldLabel>{t("store.booking.specialRequest")}</FieldLabel>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t("store.booking.specialRequestPlaceholder")}
                    maxLength={280}
                    className="h-[100px] w-full resize-none rounded-[20px] border border-gray-300 bg-transparent px-3 py-4 text-[12px] leading-[1.4] text-gray-900 outline-none placeholder:text-[var(--octo-store-select-label)] focus:border-ocean-blue"
                  />
                </label>

                {date !== "" && time !== "" && table && (
                  <section className="flex flex-col gap-3 rounded-[32px] bg-[var(--octo-store-summary)] p-3">
                    <h2 className="px-3 text-[14px] font-medium leading-none text-black">
                      {t("store.booking.summary")}
                    </h2>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2">
                        <BookingNotice>{t("store.booking.depositNotice", { n: BOOKING_DEPOSIT_SAR })}</BookingNotice>

                        <SummaryRow icon={<TableIcon name="calendar" />} label={t("store.booking.day")}>
                          <p className={SUMMARY_VALUE}>{formatBookingDate(date, locale, true)}</p>
                        </SummaryRow>
                        <SummaryRow icon={<TableIcon name="clock-gray-24" />} label={t("store.booking.time")}>
                          <p className={SUMMARY_VALUE}>{formatBookingTime(time, t)}</p>
                        </SummaryRow>
                        <SummaryRow
                          icon={<TableIcon name="table-round" size={[21.5, 18.5]} />}
                          label={t("store.booking.table")}
                        >
                          <p className={SUMMARY_VALUE}>
                            {t(`store.booking.zone.${table.zones[0]}`)} - <span dir="ltr">{table.label}</span>
                          </p>
                        </SummaryRow>
                        <SummaryRow icon={<TableIcon name="celebrate" />} label={t("store.booking.occasionTitle")}>
                          <p className={SUMMARY_VALUE}>{t(`store.booking.occasion.${occasion}`)}</p>
                        </SummaryRow>
                        {note.trim() !== "" && (
                          <SummaryRow icon={<TableIcon name="message" />} label={t("store.booking.specialRequestLabel")}>
                            <p className={SUMMARY_VALUE}>{note.trim()}</p>
                          </SummaryRow>
                        )}
                        <SummaryRow icon={<TableIcon name="moneys" />} label={t("store.booking.deposit")}>
                          <p className="text-[18px] font-bold text-[var(--octo-store-select-text)]">
                            <span dir="ltr">{BOOKING_DEPOSIT_SAR}</span> {t("store.currency")}
                          </p>
                        </SummaryRow>
                      </div>

                      <button
                        type="button"
                        onClick={payDeposit}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-ocean-blue px-3 text-[16px] font-bold leading-none text-white"
                      >
                        {t("store.booking.payDeposit")}
                        <TableIcon name="arrow-left-white" className="ltr:-scale-x-100" />
                      </button>
                      {attempted === "all" && !detailsValid && (
                        <p aria-live="polite" className="px-3 text-[12px] font-medium text-[var(--octo-store-danger)]">
                          {t("store.booking.detailsMissing")}
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>

        <TableFooter />
      </div>

      {waitlistOpen && (
        <WaitlistSheet
          open
          onClose={() => setWaitlistOpen(false)}
          guests={guests}
          date={date}
          time={time}
          today={today}
          onConfirm={(next) => {
            setWaitlistOpen(false);
            setQuote(next);
          }}
        />
      )}

      <TableModal open={quote !== null} onClose={() => setQuote(null)} dim label={t("store.booking.waitlistDoneTitle")}>
        {quote && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex w-full flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/table/stamp.gif" alt="" className="size-[136px]" />
              <div className="flex w-full flex-col gap-3 text-center leading-none">
                <h2 className="text-[18px] font-bold text-gray-900">{t("store.booking.waitlistDoneTitle")}</h2>
                <p className="tbl-wrap-safe text-[12px] font-medium text-[var(--octo-store-select-label)]">
                  {t("store.booking.waitlistDoneBody")}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col items-center gap-3 rounded-[24px] bg-gray-100 p-4">
              <p className="text-center text-[14px] font-bold leading-none text-[var(--octo-store-select-text)]">
                {t("store.booking.waitlistPosition", { n: quote.position })}
              </p>
              <p className="text-center text-[12px] font-medium leading-[1.4] text-[var(--octo-store-select-label)]">
                {t("store.booking.waitlistWait")}{" "}
                <span className="font-semibold text-gray-900">
                  {t("store.booking.waitlistMinutes", { a: quote.minMinutes, b: quote.maxMinutes })}
                </span>
              </p>
            </div>
          </div>
        )}
      </TableModal>
    </div>
  );
}
