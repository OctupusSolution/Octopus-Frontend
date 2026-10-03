// The Waiting List section's inspector. Module and Setting follow the frames —
// Module carries the enable card, homepage display, the primary action ("Open
// waitlist drawer"), availability preview and the next-available label and
// format; Setting carries queue method, party size, wait-time display, update
// interval, the notification channels and auto-remove. Policies and
// Notifications, named but not drawn in the frames, hold the waitlist's rules
// and its guest/staff alerts.
import { useState } from "react";
import type { SiteAction, SiteDraft, WaitlistSettings } from "../../_shared/site-draft";
import { usePlText } from "../../_shared/texts";
import { rangeFailures, rules, useTouched, useValidation } from "../../_shared/validation";
import { PlField, PlInput, PlTextarea } from "../../ui/kit";
import { CheckCard, NumberedHeading, RadioCard, ToggleRow, InspectorTabs } from "./controls";
import { digitsOnly, EnableCard, FieldGroup, MiniToggleRow, OptionSelect, SelectCard, SoftButton, SubField } from "./inspector-parts";

const TARGET_IDS = ["waitlist", "reservations", "menu", "contact"] as const;
const UPDATE_INTERVAL_OPTIONS = ["5", "10", "15"] as const;
const AUTO_REMOVE_OPTIONS = ["10", "20", "30"] as const;
const FORMAT_OPTIONS = ["30min", "1h"] as const;
const MAX_WAIT_OPTIONS: readonly WaitlistSettings["maxWaitMinutes"][] = ["30", "60", "90"];

const PARTY_BOUNDS = { min: 1, max: 100 } as const;
const MAX_LABEL_LENGTH = 40;
const MAX_POLICY_NOTE_LENGTH = 300;

const TABS = [
  { id: "module", labelKey: "publicLink.inspector.module" },
  { id: "setting", labelKey: "publicLink.inspector.setting" },
  { id: "policies", labelKey: "publicLink.inspector.policies" },
  { id: "notifications", labelKey: "publicLink.inspector.notifications" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function WaitlistInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const tx = usePlText();
  const { check, message } = useValidation();
  const { touched, touch } = useTouched();
  const [tab, setTab] = useState<TabId>("module");
  const settings = draft.sectionSettings.waitlist;
  const placeholder = tx("publicLink.select.placeholder");

  const party = rangeFailures(settings.minParty, settings.maxParty, PARTY_BOUNDS);
  const errors = {
    primaryAction: check(settings.primaryAction, [rules.required()]),
    // The label is printed beside the estimated wait, so it is needed only
    // while that preview is on.
    label: check(settings.nextAvailableLabel, [...(settings.availabilityPreview ? [rules.required()] : []), rules.maxLength(MAX_LABEL_LENGTH)]),
    format: check(settings.format, [rules.required()]),
    minParty: message(party.min),
    maxParty: message(party.max),
    updateInterval: check(settings.updateInterval, [rules.required()]),
    autoRemove: check(settings.autoRemove, [rules.required()]),
    maxWait: check(settings.maxWaitMinutes, [rules.required()]),
    policyNote: check(settings.policyNote, [rules.maxLength(MAX_POLICY_NOTE_LENGTH)]),
  };
  const shown = (name: keyof typeof errors) => (touched(name) ? errors[name] : undefined);

  function patch(patch: Partial<WaitlistSettings>) {
    dispatch({ type: "patchSection", section: "waitlist", patch });
  }

  const channels = (
    <div className="flex flex-col gap-2">
      <MiniToggleRow label={tx("pl.customize.insp.whatsapp")} checked={settings.notifyWhatsapp} onChange={() => patch({ notifyWhatsapp: !settings.notifyWhatsapp })} />
      <MiniToggleRow label={tx("pl.customize.insp.sms")} checked={settings.notifySms} onChange={() => patch({ notifySms: !settings.notifySms })} />
      <MiniToggleRow label={tx("pl.customize.insp.email")} checked={settings.notifyEmail} onChange={() => patch({ notifyEmail: !settings.notifyEmail })} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <InspectorTabs
        items={TABS.map((entry) => ({ id: entry.id, label: tx(entry.labelKey) }))}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {tab === "module" && (
        <div className="flex flex-col gap-4">
          <NumberedHeading n={1} title={tx("pl.customize.wl.module")} note={tx("pl.customize.wl.moduleNote")} />

          <div className="flex flex-col gap-3">
            <EnableCard
              title={tx("pl.customize.wl.enable")}
              note={tx("pl.customize.wl.enableNote")}
              status={tx("pl.customize.wl.active")}
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

          <NumberedHeading n={3} title={tx("pl.customize.insp.primaryAction")} note={tx("pl.customize.wl.primaryNote")} />
          <SelectCard
            label={tx("pl.customize.insp.primaryAction")}
            value={settings.primaryAction}
            placeholder={placeholder}
            invalid={Boolean(shown("primaryAction"))}
            options={TARGET_IDS.map((id) =>
              id === "waitlist"
                ? { id, title: tx("pl.customize.wl.openDrawer"), note: tx("pl.customize.wl.openDrawerNote") }
                : { id, title: tx(`publicLink.target.${id}`), note: tx("pl.customize.insp.targetNote") }
            )}
            onChange={(primaryAction) => patch({ primaryAction })}
            onBlur={() => touch("primaryAction")}
          />

          <ToggleRow
            label={tx("pl.customize.insp.availability")}
            note={tx("pl.customize.wl.availabilityNote")}
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
              <SubField label={tx("pl.customize.wl.format")} error={shown("format")}>
                <OptionSelect
                  label={tx("pl.customize.wl.format")}
                  value={settings.format}
                  options={FORMAT_OPTIONS}
                  labelFor={(id) => tx(`pl.customize.wl.format.${id}`)}
                  placeholder={placeholder}
                  invalid={Boolean(shown("format"))}
                  onChange={(format) => patch({ format })}
                  onBlur={() => touch("format")}
                />
              </SubField>
            </div>
          </FieldGroup>
        </div>
      )}

      {tab === "setting" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <span className="text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">{tx("pl.customize.wl.queueMethod")}</span>
            <div className="flex flex-col gap-3">
              <RadioCard
                title={tx("pl.customize.wl.fifo")}
                note={tx("pl.customize.wl.fifoNote")}
                selected={settings.queueMethod === "fifo"}
                onSelect={() => patch({ queueMethod: "fifo" })}
              />
              <RadioCard
                title={tx("pl.customize.wl.priority")}
                note={tx("pl.customize.wl.priorityNote")}
                selected={settings.queueMethod === "priority"}
                onSelect={() => patch({ queueMethod: "priority" })}
              />
            </div>
          </div>

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

          <ToggleRow
            label={tx("pl.customize.wl.waitTime")}
            note={tx("pl.customize.wl.waitTimeNote")}
            checked={settings.showWaitTime}
            onChange={() => patch({ showWaitTime: !settings.showWaitTime })}
          />

          <SubField label={tx("pl.customize.wl.updateInterval")} error={shown("updateInterval")}>
            <OptionSelect
              label={tx("pl.customize.wl.updateInterval")}
              value={settings.updateInterval}
              options={UPDATE_INTERVAL_OPTIONS}
              labelFor={(id) => tx(`publicLink.waitlist.updateInterval.${id}`)}
              placeholder={placeholder}
              invalid={Boolean(shown("updateInterval"))}
              onChange={(updateInterval) => patch({ updateInterval })}
              onBlur={() => touch("updateInterval")}
            />
          </SubField>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">{tx("pl.customize.wl.notifications")}</span>
            {channels}
          </div>

          <SubField label={tx("pl.customize.wl.autoRemove")} note={tx("pl.customize.wl.autoRemoveNote")} error={shown("autoRemove")}>
            <OptionSelect
              label={tx("pl.customize.wl.autoRemove")}
              value={settings.autoRemove}
              options={AUTO_REMOVE_OPTIONS}
              labelFor={(id) => tx(`publicLink.waitlist.autoRemove.${id}`)}
              placeholder={placeholder}
              invalid={Boolean(shown("autoRemove"))}
              onChange={(autoRemove) => patch({ autoRemove })}
              onBlur={() => touch("autoRemove")}
            />
          </SubField>
        </div>
      )}

      {tab === "policies" && (
        <div className="flex flex-col gap-4">
          <PlField label={tx("publicLink.waitlist.maxWait")} error={shown("maxWait")}>
            <OptionSelect
              label={tx("publicLink.waitlist.maxWait")}
              value={settings.maxWaitMinutes}
              options={MAX_WAIT_OPTIONS}
              labelFor={(id) => tx(`publicLink.waitlist.maxWait.${id}`)}
              placeholder={placeholder}
              invalid={Boolean(shown("maxWait"))}
              onChange={(maxWaitMinutes) => patch({ maxWaitMinutes })}
              onBlur={() => touch("maxWait")}
            />
          </PlField>

          <ToggleRow
            label={tx("publicLink.waitlist.requirePhone")}
            note={tx("publicLink.waitlist.requirePhoneNote")}
            checked={settings.requirePhone}
            onChange={() => patch({ requirePhone: !settings.requirePhone })}
          />

          <ToggleRow
            label={tx("publicLink.waitlist.allowSelfCancel")}
            note={tx("publicLink.waitlist.allowSelfCancelNote")}
            checked={settings.allowSelfCancel}
            onChange={() => patch({ allowSelfCancel: !settings.allowSelfCancel })}
          />

          <PlField label={tx("publicLink.waitlist.policyNote")} error={shown("policyNote")}>
            <PlTextarea
              rows={3}
              aria-label={tx("publicLink.waitlist.policyNote")}
              placeholder={tx("publicLink.waitlist.policyNotePlaceholder")}
              value={settings.policyNote}
              invalid={Boolean(shown("policyNote"))}
              onChange={(e) => patch({ policyNote: e.target.value })}
              onBlur={() => touch("policyNote")}
            />
          </PlField>
        </div>
      )}

      {tab === "notifications" && (
        <div className="flex flex-col gap-4">
          <FieldGroup label={tx("pl.customize.wl.notifications")}>{channels}</FieldGroup>

          <ToggleRow
            label={tx("publicLink.waitlist.notifyReady")}
            note={tx("publicLink.waitlist.notifyReadyNote")}
            checked={settings.notifyReady}
            onChange={() => patch({ notifyReady: !settings.notifyReady })}
          />
          <ToggleRow
            label={tx("publicLink.waitlist.reminder")}
            note={tx("publicLink.waitlist.reminderNote")}
            checked={settings.reminderEnabled}
            onChange={() => patch({ reminderEnabled: !settings.reminderEnabled })}
          />
          <ToggleRow
            label={tx("publicLink.reservations.notifyStaff")}
            note={tx("publicLink.waitlist.notifyStaffNote")}
            checked={settings.notifyStaff}
            onChange={() => patch({ notifyStaff: !settings.notifyStaff })}
          />
        </div>
      )}
    </div>
  );
}
