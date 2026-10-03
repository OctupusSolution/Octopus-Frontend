// apps/merchant/src/pages/orders-list/_shared/scope-reason-form.tsx
import { useState } from "react";
import { Select, Textarea } from "@ui/primitives";
import { RadioCardGroup, type RadioCardOption } from "./radio-card";
import { FieldLabel, PrimaryButton } from "./form-bits";

export interface ScopeReasonPayload {
  scope: string;
  reason: string;
  note: string;
}

export function ScopeReasonForm({
  title,
  scopeLabel,
  scopeOptions,
  reasonLabel,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
  onSubmit,
}: {
  title: string;
  scopeLabel: string;
  scopeOptions: readonly RadioCardOption<string>[];
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  onSubmit: (payload: ScopeReasonPayload) => void;
}) {
  const [scope, setScope] = useState(scopeOptions[0].value);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <div>
      <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{title}</h2>

      <div className="mt-5">
        <FieldLabel>{scopeLabel}</FieldLabel>
        <RadioCardGroup name="scope" options={scopeOptions} value={scope} onChange={setScope} />
      </div>

      <div className="mt-4">
        <FieldLabel>{reasonLabel}</FieldLabel>
        <Select value={reason} onChange={(event) => setReason(event.target.value)} aria-label={reasonLabel}>
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
        <FieldLabel>{noteLabel}</FieldLabel>
        <Textarea
          placeholder={notePlaceholder}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-label={noteLabel}
        />
      </div>

      <PrimaryButton
        className="mt-5"
        label={submitLabel}
        disabled={!reason}
        onClick={() => onSubmit({ scope, reason, note })}
      />
    </div>
  );
}
