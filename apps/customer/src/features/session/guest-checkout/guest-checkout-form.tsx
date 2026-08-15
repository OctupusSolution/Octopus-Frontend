"use client";

import { useState } from "react";
import { Input } from "@ui/primitives";
import type { GuestInfo } from "@/entities/customer";

const PHONE_REGEX = /^(?:\+9665\d{8}|05\d{8})$/;

export function isValidGuestName(name: string): boolean {
  return name.trim().length >= 2;
}

export function isValidGuestPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

export interface GuestCheckoutFormProps {
  value: GuestInfo;
  onChange: (value: GuestInfo) => void;
}

export function GuestCheckoutForm({ value, onChange }: GuestCheckoutFormProps) {
  const [touched, setTouched] = useState({ name: false, phone: false });

  const nameError = touched.name && !isValidGuestName(value.name) ? "الاسم يجب أن يتكون من حرفين على الأقل" : undefined;
  const phoneError = touched.phone && !isValidGuestPhone(value.phone) ? "رقم جوال غير صحيح" : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="الاسم"
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
        error={nameError}
      />
      <Input
        label="رقم الجوال"
        placeholder="05xxxxxxxx"
        value={value.phone}
        onChange={(event) => onChange({ ...value, phone: event.target.value })}
        onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
        error={phoneError}
      />
    </div>
  );
}
