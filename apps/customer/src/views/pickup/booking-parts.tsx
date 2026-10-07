"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/app/providers";
import { BOOKING_TIMES } from "@/shared/api/mock-reservations";
import type { Translate } from "@/shared/i18n/translate";
import { TableIcon, TableRadio } from "@/shared/ui/table";

const BOX = "flex h-12 w-full items-center rounded-[20px] border p-3";
const VALUE = "text-[12px] leading-none";
const FILLED = "text-gray-900";
const EMPTY = "text-[var(--octo-store-select-label)]";

const edge = (invalid?: boolean): string => (invalid ? "border-[var(--octo-store-danger)]" : "border-gray-300");

/** "7 أكتوبر 2026" — Western digits in both languages, as the designs set them. */
export function formatBookingDate(dateKey: string, locale: string, withWeekday = false): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const tag = locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
  const text = new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric" }).format(date);
  if (!withWeekday) return text;
  return `${new Intl.DateTimeFormat(tag, { weekday: "long" }).format(date)} - ${text}`;
}

/** "08:00 م" from "20:00". */
export function formatBookingTime(time: string, t: Translate): string {
  const [hours, minutes] = time.split(":").map(Number);
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(hour12)}:${pad(minutes)} ${t(hours < 12 ? "store.booking.am" : "store.booking.pm")}`;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="px-2 text-[14px] font-medium leading-none text-black">{children}</span>;
}

/** A section of the booking form that folds down to its title. */
export function BookingSection({
  title, open, onToggle, children,
}: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[32px] border border-gray-300 bg-white p-[11px]">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between text-[16px] font-medium leading-none text-gray-900"
      >
        {title}
        <TableIcon name="chevron-down" className={open ? "-scale-y-100" : ""} />
      </button>
      {open && children}
    </section>
  );
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
  autoComplete?: string;
}

export function TextField({ label, value, onChange, placeholder, invalid, autoComplete }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-3">
      <FieldLabel>{label}</FieldLabel>
      <span className={`${BOX} ${edge(invalid)} focus-within:border-ocean-blue`}>
        <input
          type="text"
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--octo-store-select-label)] ${VALUE} ${FILLED}`}
        />
      </span>
    </label>
  );
}

/** "512 345 678" */
export const formatPhone = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 9).replace(/(.{3})(?=.)/g, "$1 ");

/** A Saudi mobile number as it is typed after the country code. */
export const isValidPhone = (value: string): boolean => /^5\d{8}$/.test(value.replace(/\D/g, ""));

export function PhoneField({
  label, value, onChange, invalid,
}: { label: string; value: string; onChange: (value: string) => void; invalid?: boolean }) {
  return (
    <label className="flex flex-col gap-3">
      <FieldLabel>{label}</FieldLabel>
      <span className={`${BOX} gap-2 ${edge(invalid)} focus-within:border-ocean-blue`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/table/flag-sa.png" alt="" className="size-6 shrink-0 object-cover" />
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span dir="ltr" className={`${VALUE} ${FILLED}`}>
            +966
          </span>
          {/* The rule belongs to the page's direction; the digits inside are typed left to right. */}
          <span className="flex min-w-0 flex-1 border-s border-gray-300 p-2">
            <input
              type="tel"
              dir="ltr"
              inputMode="numeric"
              autoComplete="tel-national"
              value={value}
              onChange={(event) => onChange(formatPhone(event.target.value))}
              placeholder="000 000 000"
              aria-invalid={invalid}
              className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--octo-store-select-label)] rtl:text-right ${VALUE} ${FILLED}`}
            />
          </span>
        </span>
      </span>
    </label>
  );
}

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  invalid?: boolean;
}

/** A dropdown drawn as the design draws it, with the platform's own picker
 *  laid invisibly over it — on a phone that is the control people expect. */
export function SelectField({ label, value, onChange, placeholder, options, invalid }: SelectFieldProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <label className="flex flex-col gap-3">
      <FieldLabel>{label}</FieldLabel>
      <span className={`relative justify-between ${BOX} ${edge(invalid)} focus-within:border-ocean-blue`}>
        <span className={`${VALUE} ${selected ? FILLED : EMPTY}`}>{selected?.label ?? placeholder}</span>
        <TableIcon name="chevron-down" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** yyyy-mm-dd: the first day that can be picked. */
  min: string;
  invalid?: boolean;
}

export function DateField({ label, value, onChange, placeholder, min, invalid }: DateFieldProps) {
  const { locale } = useI18n();

  return (
    <label className="flex flex-col gap-3">
      <FieldLabel>{label}</FieldLabel>
      <span className={`relative justify-between ${BOX} ${edge(invalid)} focus-within:border-ocean-blue`}>
        <span className={`${VALUE} ${value ? FILLED : EMPTY}`}>
          {value ? formatBookingDate(value, locale) : placeholder}
        </span>
        <TableIcon name="calendar" />
        <input
          type="date"
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          // Desktop browsers open the calendar from its own glyph only; this opens it from anywhere on the field.
          onClick={(event) => event.currentTarget.showPicker?.()}
          aria-invalid={invalid}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
    </label>
  );
}

export interface GuestsFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
  invalid?: boolean;
}

export function GuestsField({ label, value, onChange, placeholder, invalid }: GuestsFieldProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel>{label}</FieldLabel>
      <div className={`${BOX} justify-center ${edge(invalid)}`}>
        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label={t("store.product.increase")}
            onClick={() => onChange(Math.min(20, value + 1))}
            className="flex size-8 items-center justify-center rounded-full bg-ocean-blue"
          >
            <TableIcon name="plus" />
          </button>
          <span className={`min-w-2 text-center ${VALUE} ${value > 0 ? FILLED : EMPTY}`}>
            {value > 0 ? value : placeholder}
          </span>
          <button
            type="button"
            aria-label={t("store.product.decrease")}
            disabled={value <= 0}
            onClick={() => onChange(Math.max(0, value - 1))}
            className="flex size-8 items-center justify-center rounded-full bg-gray-100"
          >
            <TableIcon name="minus" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** A choice drawn as an outlined row with its radio: an occasion, a time. */
export function ChoiceRow({
  label, selected, onSelect, wide = true,
}: { label: string; selected: boolean; onSelect: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex h-12 items-center rounded-[20px] border p-3 text-[14px] leading-none ${
        wide ? "w-full justify-between" : "gap-8"
      } ${
        selected
          ? "border-ocean-blue bg-[var(--octo-store-select-soft)] text-[var(--octo-store-select-text)]"
          : "border-gray-300 text-gray-900"
      }`}
    >
      {label}
      <TableRadio checked={selected} />
    </button>
  );
}

export interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
}

/** The seating time: closed it reads as a dropdown, open it lays the day's
 *  seatings out as choices. */
export function TimeField({ label, value, onChange, placeholder, invalid }: TimeFieldProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className={`flex flex-col ${open ? "gap-4" : "gap-3"}`}>
      <FieldLabel>{label}</FieldLabel>
      {open ? (
        <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
          {BOOKING_TIMES.map((time) => (
            <ChoiceRow
              key={time}
              wide={false}
              label={formatBookingTime(time, t)}
              selected={value === time}
              onSelect={() => {
                onChange(time);
                setOpen(false);
              }}
            />
          ))}
        </div>
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-invalid={invalid}
          onClick={() => setOpen(true)}
          className={`justify-between ${BOX} ${edge(invalid)}`}
        >
          <span className={`${VALUE} ${value ? FILLED : EMPTY}`}>
            {value ? formatBookingTime(value, t) : placeholder}
          </span>
          <TableIcon name="chevron-down" />
        </button>
      )}
    </div>
  );
}

/** The amber notice the booking screens raise: a deposit is due, a day is full. */
export function BookingNotice({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex w-full items-start gap-2 rounded-[20px] bg-[var(--octo-store-notice-soft)] px-3 py-2 font-semibold text-[var(--octo-store-notice-text)]">
      <TableIcon name="note-amber" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {title && <p className="text-[14px] leading-[14px]">{title}</p>}
        <p className="text-[12px] leading-[1.5]">{children}</p>
      </div>
    </div>
  );
}
