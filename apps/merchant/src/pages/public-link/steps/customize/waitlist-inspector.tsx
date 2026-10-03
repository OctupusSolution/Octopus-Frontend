// The Waiting List section's inspector. Module and Setting follow the frames —
// Module carries the enable card, homepage display, the primary action ("Open
// waitlist drawer"), availability preview and the next-available label and
// format; Setting carries queue method, party size, wait-time display, update
// interval and auto-remove. Policies and Notifications, named but not drawn in
// the frames, hold the waitlist's rules and its guest/staff alerts.
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Input, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { SiteAction, SiteDraft, WaitlistSettings } from "../../_shared/site-draft";
import { CheckCard, FieldRow, NumberedHeading, RadioCard, ToggleRow, InspectorTabs } from "./controls";

const TARGET_IDS = ["waitlist", "reservations", "menu", "contact"] as const;
const UPDATE_INTERVAL_OPTIONS = ["5", "10", "15"] as const;
const AUTO_REMOVE_OPTIONS = ["10", "20", "30"] as const;
const FORMAT_OPTIONS = ["30min", "1h"] as const;
const MAX_WAIT_OPTIONS: readonly WaitlistSettings["maxWaitMinutes"][] = ["30", "60", "90"];

const TABS = [
  { id: "module", labelKey: "publicLink.inspector.module" },
  { id: "setting", labelKey: "publicLink.inspector.setting" },
  { id: "policies", labelKey: "publicLink.inspector.policies" },
  { id: "notifications", labelKey: "publicLink.inspector.notifications" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Module scope: a component redefined on every render would remount on every
 *  keystroke elsewhere in this panel. Opens on a real placeholder rather than a
 *  blank row. */
function OptionSelect<T extends string>({
  value,
  options,
  labelFor,
  onChange,
}: {
  value: string;
  options: readonly T[];
  labelFor: (id: T) => string;
  onChange: (id: T) => void;
}) {
  const { t } = useI18n();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as T)}>
      <option value="" disabled>
        {t("publicLink.select.placeholder")}
      </option>
      {options.map((id) => (
        <option key={id} value={id}>
          {labelFor(id)}
        </option>
      ))}
    </Select>
  );
}

export function WaitlistInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("module");
  const settings = draft.sectionSettings.waitlist;

  function patch(patch: Partial<WaitlistSettings>) {
    dispatch({ type: "patchSection", section: "waitlist", patch });
  }

  return (
    <div className="flex flex-col gap-4">
      <InspectorTabs
        items={TABS.map((entry) => ({ id: entry.id, label: t(entry.labelKey) }))}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {tab === "module" && (
        <div className="flex flex-col gap-4">
          <NumberedHeading n={1} title={t("publicLink.waitlist.waitlistModule")} note={t("publicLink.waitlist.waitlistModuleNote")} />

          <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
            <ToggleRow
              label={t("publicLink.waitlist.enableWaitlist")}
              note={t("publicLink.waitlist.enableWaitlistNote")}
              checked={settings.enabled}
              onChange={() => patch({ enabled: !settings.enabled })}
            />
            {settings.enabled && (
              <span className="flex items-center gap-1.5 text-[11.5px] text-[#16a34a]">
                <CheckCircle2 size={13} />
                {t("publicLink.reservations.moduleActive")}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full justify-center bg-[#0D6EFD]/5 text-[#0D6EFD] hover:bg-[#0D6EFD]/10"
            onClick={() => setTab("setting")}
          >
            {t("publicLink.waitlist.moduleSetting")}
          </Button>

          <NumberedHeading n={2} title={t("publicLink.reservations.menuDisplay")} note={t("publicLink.reservations.menuDisplayNote")} />
          <div className="grid grid-cols-2 gap-3">
            <CheckCard
              title={t("publicLink.reservations.reservationWidget")}
              note={t("publicLink.reservations.reservationWidgetNote")}
              checked={settings.homepageDisplay === "widget"}
              onToggle={() => patch({ homepageDisplay: "widget" })}
            />
            <CheckCard
              title={t("publicLink.reservations.buttonLink")}
              note={t("publicLink.reservations.buttonLinkNote")}
              checked={settings.homepageDisplay === "button"}
              onToggle={() => patch({ homepageDisplay: "button" })}
            />
          </div>

          <NumberedHeading n={3} title={t("publicLink.waitlist.primaryAction")} note={t("publicLink.waitlist.primaryActionNote")} />
          <OptionSelect
            value={settings.primaryAction}
            options={TARGET_IDS}
            labelFor={(id) => t(id === "waitlist" ? "publicLink.waitlist.openDrawer" : `publicLink.target.${id}`)}
            onChange={(primaryAction) => patch({ primaryAction })}
          />

          <ToggleRow
            label={t("publicLink.reservations.availabilityPreview")}
            note={t("publicLink.waitlist.availabilityNote")}
            checked={settings.availabilityPreview}
            onChange={() => patch({ availabilityPreview: !settings.availabilityPreview })}
          />

          <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.reservations.showNextAvailable")}</p>
          <div className="-mt-2 grid grid-cols-2 gap-3">
            <FieldRow label={t("publicLink.reservations.label")}>
              <Input
                placeholder={t("publicLink.waitlist.labelPlaceholder")}
                value={settings.nextAvailableLabel}
                onChange={(e) => patch({ nextAvailableLabel: e.target.value })}
              />
            </FieldRow>
            <FieldRow label={t("publicLink.waitlist.format")}>
              <OptionSelect
                value={settings.format}
                options={FORMAT_OPTIONS}
                labelFor={(id) => t(`publicLink.waitlist.format.${id}`)}
                onChange={(format) => patch({ format })}
              />
            </FieldRow>
          </div>
        </div>
      )}

      {tab === "setting" && (
        <div className="flex flex-col gap-4">
          <FieldRow label={t("publicLink.waitlist.queueMethod")}>
            <div className="grid grid-cols-2 gap-3">
              <RadioCard
                title={t("publicLink.waitlist.fifo")}
                note={t("publicLink.waitlist.fifoNote")}
                selected={settings.queueMethod === "fifo"}
                onSelect={() => patch({ queueMethod: "fifo" })}
              />
              <RadioCard
                title={t("publicLink.waitlist.priority")}
                note={t("publicLink.waitlist.priorityNote")}
                selected={settings.queueMethod === "priority"}
                onSelect={() => patch({ queueMethod: "priority" })}
              />
            </div>
          </FieldRow>

          <FieldRow label={t("publicLink.reservations.partySize")}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={1}
                label={t("publicLink.reservations.min")}
                value={settings.minParty}
                onChange={(e) => patch({ minParty: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                label={t("publicLink.reservations.max")}
                value={settings.maxParty}
                onChange={(e) => patch({ maxParty: e.target.value })}
              />
            </div>
          </FieldRow>

          <ToggleRow
            label={t("publicLink.waitlist.waitTimeDisplay")}
            note={t("publicLink.waitlist.waitTimeDisplayNote")}
            checked={settings.showWaitTime}
            onChange={() => patch({ showWaitTime: !settings.showWaitTime })}
          />

          <FieldRow label={t("publicLink.waitlist.updateInterval")}>
            <OptionSelect
              value={settings.updateInterval}
              options={UPDATE_INTERVAL_OPTIONS}
              labelFor={(id) => t(`publicLink.waitlist.updateInterval.${id}`)}
              onChange={(updateInterval) => patch({ updateInterval })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.waitlist.autoRemove")}>
            <>
              <OptionSelect
                value={settings.autoRemove}
                options={AUTO_REMOVE_OPTIONS}
                labelFor={(id) => t(`publicLink.waitlist.autoRemove.${id}`)}
                onChange={(autoRemove) => patch({ autoRemove })}
              />
              <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.waitlist.autoRemoveNote")}</p>
            </>
          </FieldRow>
        </div>
      )}

      {tab === "policies" && (
        <div className="flex flex-col gap-4">
          <FieldRow label={t("publicLink.waitlist.maxWait")}>
            <OptionSelect
              value={settings.maxWaitMinutes}
              options={MAX_WAIT_OPTIONS}
              labelFor={(id) => t(`publicLink.waitlist.maxWait.${id}`)}
              onChange={(maxWaitMinutes) => patch({ maxWaitMinutes })}
            />
          </FieldRow>

          <ToggleRow
            label={t("publicLink.waitlist.requirePhone")}
            note={t("publicLink.waitlist.requirePhoneNote")}
            checked={settings.requirePhone}
            onChange={() => patch({ requirePhone: !settings.requirePhone })}
          />

          <ToggleRow
            label={t("publicLink.waitlist.allowSelfCancel")}
            note={t("publicLink.waitlist.allowSelfCancelNote")}
            checked={settings.allowSelfCancel}
            onChange={() => patch({ allowSelfCancel: !settings.allowSelfCancel })}
          />

          <FieldRow label={t("publicLink.waitlist.policyNote")}>
            <Textarea
              rows={3}
              placeholder={t("publicLink.waitlist.policyNotePlaceholder")}
              value={settings.policyNote}
              onChange={(e) => patch({ policyNote: e.target.value })}
            />
          </FieldRow>
        </div>
      )}

      {tab === "notifications" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.waitlist.notifications")}</p>
            <ToggleRow label={t("publicLink.waitlist.whatsapp")} checked={settings.notifyWhatsapp} onChange={() => patch({ notifyWhatsapp: !settings.notifyWhatsapp })} />
            <ToggleRow label={t("publicLink.waitlist.sms")} checked={settings.notifySms} onChange={() => patch({ notifySms: !settings.notifySms })} />
            <ToggleRow label={t("publicLink.waitlist.email")} checked={settings.notifyEmail} onChange={() => patch({ notifyEmail: !settings.notifyEmail })} />
          </div>

          <ToggleRow
            label={t("publicLink.waitlist.notifyReady")}
            note={t("publicLink.waitlist.notifyReadyNote")}
            checked={settings.notifyReady}
            onChange={() => patch({ notifyReady: !settings.notifyReady })}
          />
          <ToggleRow
            label={t("publicLink.waitlist.reminder")}
            note={t("publicLink.waitlist.reminderNote")}
            checked={settings.reminderEnabled}
            onChange={() => patch({ reminderEnabled: !settings.reminderEnabled })}
          />
          <ToggleRow
            label={t("publicLink.reservations.notifyStaff")}
            note={t("publicLink.waitlist.notifyStaffNote")}
            checked={settings.notifyStaff}
            onChange={() => patch({ notifyStaff: !settings.notifyStaff })}
          />
        </div>
      )}
    </div>
  );
}
