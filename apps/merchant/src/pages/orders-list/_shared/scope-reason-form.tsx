// apps/merchant/src/pages/orders-list/_shared/scope-reason-form.tsx
import { useState } from "react";
import { RadioCardGroup, type RadioCardOption } from "./radio-card";
import { FLOW_TEXTAREA_CLASS, FieldLabel, FlowSelect, PrimaryButton } from "./form-bits";

export interface ScopeReasonPayload {
  scope: string;
  reason: string;
  note: string;
}

/** The body of the Cancel / Void form step. The dialog title is drawn by the
 *  surrounding `Modal` so it stays put while this body scrolls. */
export function ScopeReasonForm({
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
    <div className="flex flex-col gap-6">
      <div>
        <FieldLabel required className="mb-3">
          {scopeLabel}
        </FieldLabel>
        <RadioCardGroup name="scope" options={scopeOptions} value={scope} onChange={setScope} />
      </div>

      <div>
        <FieldLabel required>{reasonLabel}</FieldLabel>
        <FlowSelect value={reason} onChange={setReason} ariaLabel={reasonLabel}>
          <option value="" disabled>
            {reasonPlaceholder}
          </option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FlowSelect>
      </div>

      <div>
        <FieldLabel>{noteLabel}</FieldLabel>
        <textarea
          className={FLOW_TEXTAREA_CLASS}
          placeholder={notePlaceholder}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-label={noteLabel}
        />
      </div>

      <PrimaryButton label={submitLabel} disabled={!reason} onClick={() => onSubmit({ scope, reason, note })} />
    </div>
  );
}
