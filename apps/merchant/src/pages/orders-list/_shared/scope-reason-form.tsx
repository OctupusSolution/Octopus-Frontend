// apps/merchant/src/pages/orders-list/_shared/scope-reason-form.tsx
import { useState } from "react";
import { Select, Textarea } from "@ui/primitives";
import { RadioCardGroup, type RadioCardOption } from "./radio-card";

export interface ScopeReasonPayload {
  scope: string;
  reason: string;
  note: string;
}

export function ScopeReasonForm({
  title,
  scopeOptions,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
  accent,
  onSubmit,
}: {
  title: string;
  scopeOptions: readonly RadioCardOption<string>[];
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  accent: string;
  onSubmit: (payload: ScopeReasonPayload) => void;
}) {
  const [scope, setScope] = useState(scopeOptions[0].value);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <div>
      <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{title}</h2>

      <RadioCardGroup name="scope" options={scopeOptions} value={scope} onChange={setScope} className="mt-4" />

      <div className="mt-4">
        <Select value={reason} onChange={(event) => setReason(event.target.value)}>
          <option value="" disabled>
            {reasonPlaceholder}
          </option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <Textarea
          label={noteLabel}
          placeholder={notePlaceholder}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <button
        type="button"
        disabled={!reason}
        onClick={() => onSubmit({ scope, reason, note })}
        className="mt-5 w-full rounded-[9px] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
