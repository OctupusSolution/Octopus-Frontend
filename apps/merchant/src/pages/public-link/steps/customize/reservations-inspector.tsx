// The Reservations section's inspector: Module and Setting as the frames draw
// them, plus Policies (cancellation, no-show fee, deposit refund, booking
// terms) and Notifications (confirmation channels, reminders, staff alerts) —
// the two tabs the frames name but never draw, built from the same controls.
import { useState } from "react";
import type { ReservationSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { usePlText } from "../../_shared/texts";
import { rangeFailures, rules, useTouched, useValidation } from "../../_shared/validation";
import { PlField, PlInput, PlTextarea } from "../../ui/kit";
import { CheckCard, NumberedHeading, RadioCard, ToggleRow, InspectorTabs } from "./controls";
import { amountOnly, digitsOnly, EnableCard, FieldGroup, MiniToggleRow, OptionSelect, SelectCard, SoftButton, SubField } from "./inspector-parts";

const TARGET_IDS = ["reservations", "menu", "offers", "waitlist", "contact"] as const;

const BOOKING_WINDOW_OPTIONS = ["30", "60", "90"] as const;
const CUT_OFF_OPTIONS = ["1", "2", "4"] as const;
const TABLE_HOLD_OPTIONS = ["10", "15", "30"] as const;
const DATE_RANGE_OPTIONS = ["7", "14", "30"] as const;
const CANCELLATION_OPTIONS: readonly ReservationSettings["cancellationWindow"][] = ["none", "2", "12", "24", "48"];
const REFUND_OPTIONS: readonly ReservationSettings["depositRefund"][] = ["full", "partial", "none"];
const REMINDER_OPTIONS: readonly ReservationSettings["reminderBefore"][] = ["1", "2", "24"];

const PARTY_BOUNDS = { min: 1, max: 100 } as const;
const MAX_LABEL_LENGTH = 40;
const MAX_TERMS_LENGTH = 500;
const MAX_NO_SHOW_FEE = 10000;

const TABS = [
  { id: "module", labelKey: "publicLink.inspector.module" },
  { id: "setting", labelKey: "publicLink.inspector.setting" },
  { id: "policies", labelKey: "publicLink.inspector.policies" },
  { id: "notifications", labelKey: "publicLink.inspector.notifications" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ReservationsInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const tx = usePlText();
  const { check, message } = useValidation();
  const { touched, touch } = useTouched();
  const [tab, setTab] = useState<TabId>("module");
  const settings = draft.sectionSettings.reservations;
  const placeholder = tx("publicLink.select.placeholder");

  const party = rangeFailures(settings.minParty, settings.maxParty, PARTY_BOUNDS);
  const errors = {
    primaryAction: check(settings.primaryAction, [rules.required()]),
    // The label is what the homepage prints beside the next free slot, so it
    // is needed only while that preview is on.
    label: check(settings.nextAvailableLabel, [...(settings.availabilityPreview ? [rules.required()] : []), rules.maxLength(MAX_LABEL_LENGTH)]),
    dateRange: check(settings.dateRange, [rules.required()]),
    bookingWindow: check(settings.bookingWindow, [rules.required()]),
    cutOff: check(settings.cutOff, [rules.required()]),
    minParty: message(party.min),
    maxParty: message(party.max),
    tableHold: check(settings.tableHold, [rules.required()]),
    cancellationWindow: check(settings.cancellationWindow, [rules.required()]),
    noShowAmount: check(settings.noShowAmount, [...(settings.noShowFee ? [rules.required()] : []), rules.amount({ min: 0, max: MAX_NO_SHOW_FEE })]),
    terms: check(settings.termsText, [rules.maxLength(MAX_TERMS_LENGTH)]),
    reminderBefore: check(settings.reminderBefore, [rules.required()]),
  };
  const shown = (name: keyof typeof errors) => (touched(name) ? errors[name] : undefined);

  function patch(patch: Partial<ReservationSettings>) {
    dispatch({ type: "patchSection", section: "reservations", patch });
  }

  return (
    <div className="flex flex-col gap-4">
      <InspectorTabs
        items={TABS.map((entry) => ({ id: entry.id, label: tx(entry.labelKey) }))}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {tab === "module" && (
        <div className="flex flex-col gap-4">
          <NumberedHeading n={1} title={tx("pl.customize.res.module")} note={tx("pl.customize.res.moduleNote")} />

          <div className="flex flex-col gap-3">
            <EnableCard
              title={tx("pl.customize.res.enable")}
              note={tx("pl.customize.res.enableNote")}
              status={tx("pl.customize.res.active")}
              checked={settings.enabled}
              onChange={() => patch({ enabled: !settings.enabled })}
            />
            <SoftButton onClick={() => setTab("setting")}>{tx("pl.customize.insp.moduleSetting")}</SoftButton>
          </div>

          <NumberedHeading n={2} title={tx("pl.customize.insp.displayOnHomepage")} note={tx("pl.customize.res.displayNote")} />
          <div className="flex flex-col gap-3">
            <CheckCard
              title={tx("pl.customize.insp.widget")}
              note={tx("pl.customize.insp.widgetNote")}
              checked={settings.homepageDisplay === "widget"}
              onToggle={() => patch({ homepageDisplay: "widget" })}
            />
            <CheckCard
              title={tx("pl.customize.insp.button")}
              note={tx("pl.customize.insp.buttonNote")}
              checked={settings.homepageDisplay === "button"}
              onToggle={() => patch({ homepageDisplay: "button" })}
            />
          </div>

          <NumberedHeading n={3} title={tx("pl.customize.insp.primaryAction")} note={tx("pl.customize.res.primaryNote")} />
          <SelectCard
            label={tx("pl.customize.insp.primaryAction")}
            value={settings.primaryAction}
            placeholder={placeholder}
            invalid={Boolean(shown("primaryAction"))}
            options={TARGET_IDS.map((id) =>
              id === "reservations"
                ? { id, title: tx("pl.customize.res.openForm"), note: tx("pl.customize.res.openFormNote") }
                : { id, title: tx(`publicLink.target.${id}`), note: tx("pl.customize.insp.targetNote") }
            )}
            onChange={(primaryAction) => patch({ primaryAction })}
            onBlur={() => touch("primaryAction")}
          />

          <ToggleRow
            label={tx("pl.customize.insp.availability")}
            note={tx("pl.customize.res.availabilityNote")}
            checked={settings.availabilityPreview}
            onChange={() => patch({ availabilityPreview: !settings.availabilityPreview })}
          />

          <FieldGroup label={tx("pl.customize.insp.nextAvailable")}>
            <div className="grid grid-cols-2 items-start gap-3">
              <SubField label={tx("pl.customize.insp.label")} error={shown("label")}>
                <PlInput
                  aria-label={tx("pl.customize.insp.label")}
                  placeholder={tx("pl.customize.insp.labelPlaceholder")}
                  maxLength={MAX_LABEL_LENGTH}
                  value={settings.nextAvailableLabel}
                  invalid={Boolean(shown("label"))}
                  onChange={(e) => patch({ nextAvailableLabel: e.target.value })}
                  onBlur={() => touch("label")}
                />
              </SubField>
              <SubField label={tx("pl.customize.res.dateRange")} error={shown("dateRange")}>
                <OptionSelect
                  label={tx("pl.customize.res.dateRange")}
                  value={settings.dateRange}
                  options={DATE_RANGE_OPTIONS}
                  labelFor={(id) => tx(`publicLink.reservations.dateRange.${id}`)}
                  placeholder={placeholder}
                  invalid={Boolean(shown("dateRange"))}
                  onChange={(dateRange) => patch({ dateRange })}
                  onBlur={() => touch("dateRange")}
                />
              </SubField>
            </div>
          </FieldGroup>
        </div>
      )}

      {tab === "setting" && (
        <div className="flex flex-col gap-4">
          <PlField label={tx("pl.customize.res.bookingWindow")} error={shown("bookingWindow")}>
            <OptionSelect
              label={tx("pl.customize.res.bookingWindow")}
              value={settings.bookingWindow}
              options={BOOKING_WINDOW_OPTIONS}
              labelFor={(id) => tx(`publicLink.reservations.bookingWindow.${id}`)}
              placeholder={placeholder}
              invalid={Boolean(shown("bookingWindow"))}
              onChange={(bookingWindow) => patch({ bookingWindow })}
              onBlur={() => touch("bookingWindow")}
            />
          </PlField>

          <PlField label={tx("pl.customize.res.cutOff")} error={shown("cutOff")}>
            <OptionSelect
              label={tx("pl.customize.res.cutOff")}
              value={settings.cutOff}
              options={CUT_OFF_OPTIONS}
              labelFor={(id) => tx(`publicLink.reservations.cutOff.${id}`)}
              placeholder={placeholder}
              invalid={Boolean(shown("cutOff"))}
              onChange={(cutOff) => patch({ cutOff })}
              onBlur={() => touch("cutOff")}
            />
          </PlField>

          <FieldGroup label={tx("pl.customize.insp.partySize")}>
            <div className="grid grid-cols-2 items-start gap-3">
              <SubField label={tx("pl.customize.insp.min")} error={shown("minParty")}>
                <PlInput
                  inputMode="numeric"
                  aria-label={`${tx("pl.customize.insp.partySize")} — ${tx("pl.customize.insp.min")}`}
                  placeholder={tx("pl.customize.insp.enterNumber")}
                  value={settings.minParty}
                  invalid={Boolean(shown("minParty"))}
                  onChange={(e) => patch({ minParty: digitsOnly(e.target.value) })}
                  onBlur={() => touch("minParty")}
                />
              </SubField>
              <SubField label={tx("pl.customize.insp.max")} error={shown("maxParty")}>
                <PlInput
                  inputMode="numeric"
                  aria-label={`${tx("pl.customize.insp.partySize")} — ${tx("pl.customize.insp.max")}`}
                  placeholder={tx("pl.customize.insp.enterNumber")}
                  value={settings.maxParty}
                  invalid={Boolean(shown("maxParty"))}
                  onChange={(e) => patch({ maxParty: digitsOnly(e.target.value) })}
                  onBlur={() => touch("maxParty")}
                />
              </SubField>
            </div>
          </FieldGroup>

          <PlField label={tx("pl.customize.res.tableHold")} error={shown("tableHold")}>
            <OptionSelect
              label={tx("pl.customize.res.tableHold")}
              value={settings.tableHold}
              options={TABLE_HOLD_OPTIONS}
              labelFor={(id) => tx(`publicLink.reservations.tableHold.${id}`)}
              placeholder={placeholder}
              invalid={Boolean(shown("tableHold"))}
              onChange={(tableHold) => patch({ tableHold })}
              onBlur={() => touch("tableHold")}
            />
          </PlField>

          <ToggleRow
            label={tx("pl.customize.res.autoConfirm")}
            note={tx("pl.customize.res.autoConfirmNote")}
            checked={settings.autoConfirm}
            onChange={() => patch({ autoConfirm: !settings.autoConfirm })}
          />

          <ToggleRow
            label={`${tx("pl.customize.res.deposit")} ${tx("pl.customize.insp.optional")}`}
            note={tx("pl.customize.res.depositNote")}
            checked={settings.deposit}
            onChange={() => patch({ deposit: !settings.deposit })}
          />
        </div>
      )}

      {tab === "policies" && (
        <div className="flex flex-col gap-4">
          <PlField label={tx("publicLink.reservations.cancellationWindow")} error={shown("cancellationWindow")}>
            <OptionSelect
              label={tx("publicLink.reservations.cancellationWindow")}
              value={settings.cancellationWindow}
              options={CANCELLATION_OPTIONS}
              labelFor={(id) => tx(`publicLink.reservations.cancellationWindow.${id}`)}
              placeholder={placeholder}
              invalid={Boolean(shown("cancellationWindow"))}
              onChange={(cancellationWindow) => patch({ cancellationWindow })}
              onBlur={() => touch("cancellationWindow")}
            />
          </PlField>

          <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--pl-g300)] p-2">
            <ToggleRow
              label={tx("publicLink.reservations.noShowFee")}
              note={tx("publicLink.reservations.noShowFeeNote")}
              checked={settings.noShowFee}
              onChange={() => patch({ noShowFee: !settings.noShowFee })}
            />
            {settings.noShowFee && (
              <SubField label={tx("publicLink.reservations.noShowAmount")} error={shown("noShowAmount")}>
                <PlInput
                  inputMode="decimal"
                  aria-label={tx("publicLink.reservations.noShowAmount")}
                  placeholder="0"
                  value={settings.noShowAmount}
                  invalid={Boolean(shown("noShowAmount"))}
                  onChange={(e) => patch({ noShowAmount: amountOnly(e.target.value) })}
                  onBlur={() => touch("noShowAmount")}
                />
              </SubField>
            )}
          </div>

          <FieldGroup label={tx("publicLink.reservations.depositRefund")}>
            <div className="flex flex-col gap-3">
              {REFUND_OPTIONS.map((id) => (
                <RadioCard
                  key={id}
                  title={tx(`publicLink.reservations.depositRefund.${id}`)}
                  note={tx(`publicLink.reservations.depositRefund.${id}Note`)}
                  selected={settings.depositRefund === id}
                  onSelect={() => patch({ depositRefund: id })}
                />
              ))}
            </div>
          </FieldGroup>

          <PlField label={tx("publicLink.reservations.terms")} error={shown("terms")}>
            <PlTextarea
              rows={4}
              aria-label={tx("publicLink.reservations.terms")}
              placeholder={tx("publicLink.reservations.termsPlaceholder")}
              value={settings.termsText}
              invalid={Boolean(shown("terms"))}
              onChange={(e) => patch({ termsText: e.target.value })}
              onBlur={() => touch("terms")}
            />
          </PlField>
        </div>
      )}

      {tab === "notifications" && (
        <div className="flex flex-col gap-4">
          <FieldGroup label={tx("publicLink.reservations.channels")}>
            <div className="flex flex-col gap-2">
              <MiniToggleRow label={tx("pl.customize.insp.whatsapp")} checked={settings.notifyWhatsapp} onChange={() => patch({ notifyWhatsapp: !settings.notifyWhatsapp })} />
              <MiniToggleRow label={tx("pl.customize.insp.sms")} checked={settings.notifySms} onChange={() => patch({ notifySms: !settings.notifySms })} />
              <MiniToggleRow label={tx("pl.customize.insp.email")} checked={settings.notifyEmail} onChange={() => patch({ notifyEmail: !settings.notifyEmail })} />
            </div>
          </FieldGroup>

          <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--pl-g300)] p-2">
            <ToggleRow
              label={tx("publicLink.reservations.reminder")}
              note={tx("publicLink.reservations.reminderNote")}
              checked={settings.reminderEnabled}
              onChange={() => patch({ reminderEnabled: !settings.reminderEnabled })}
            />
            {settings.reminderEnabled && (
              <SubField label={tx("publicLink.reservations.reminderBefore")} error={shown("reminderBefore")}>
                <OptionSelect
                  label={tx("publicLink.reservations.reminderBefore")}
                  value={settings.reminderBefore}
                  options={REMINDER_OPTIONS}
                  labelFor={(id) => tx(`publicLink.reservations.reminderBefore.${id}`)}
                  placeholder={placeholder}
                  invalid={Boolean(shown("reminderBefore"))}
                  onChange={(reminderBefore) => patch({ reminderBefore })}
                  onBlur={() => touch("reminderBefore")}
                />
              </SubField>
            )}
          </div>

          <ToggleRow
            label={tx("publicLink.reservations.notifyStaff")}
            note={tx("publicLink.reservations.notifyStaffNote")}
            checked={settings.notifyStaff}
            onChange={() => patch({ notifyStaff: !settings.notifyStaff })}
          />
        </div>
      )}
    </div>
  );
}
