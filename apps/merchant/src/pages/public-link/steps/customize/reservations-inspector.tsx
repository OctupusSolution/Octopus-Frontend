// The Reservations section's inspector: Module and Setting as the frames draw
// them, plus Policies (cancellation, no-show fee, deposit refund, booking
// terms) and Notifications (confirmation channels, reminders, staff alerts) —
// the two tabs the frames name but never draw, built from the same controls.
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Input, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { ReservationSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { CheckCard, FieldRow, NumberedHeading, RadioCard, ToggleRow, InspectorTabs } from "./controls";

const TARGET_IDS = ["reservations", "menu", "offers", "waitlist", "contact"] as const;

const BOOKING_WINDOW_OPTIONS = ["30", "60", "90"] as const;
const CUT_OFF_OPTIONS = ["1", "2", "4"] as const;
const TABLE_HOLD_OPTIONS = ["10", "15", "30"] as const;
const DATE_RANGE_OPTIONS = ["7", "14", "30"] as const;
const CANCELLATION_OPTIONS: readonly ReservationSettings["cancellationWindow"][] = ["none", "2", "12", "24", "48"];
const REFUND_OPTIONS: readonly ReservationSettings["depositRefund"][] = ["full", "partial", "none"];
const REMINDER_OPTIONS: readonly ReservationSettings["reminderBefore"][] = ["1", "2", "24"];

const TABS = [
  { id: "module", labelKey: "publicLink.inspector.module" },
  { id: "setting", labelKey: "publicLink.inspector.setting" },
  { id: "policies", labelKey: "publicLink.inspector.policies" },
  { id: "notifications", labelKey: "publicLink.inspector.notifications" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Module scope: a component redefined on every render would remount on
 *  every keystroke elsewhere in this panel. */
function TargetSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        {t("publicLink.select.placeholder")}
      </option>
      {TARGET_IDS.map((id) => (
        <option key={id} value={id}>
          {t(`publicLink.target.${id}`)}
        </option>
      ))}
    </Select>
  );
}

/** A select over option ids whose labels are `${prefix}.${id}`, opening on a
 *  real placeholder rather than a blank row. */
function OptionSelect<T extends string>({
  value,
  options,
  labelPrefix,
  onChange,
}: {
  value: string;
  options: readonly T[];
  labelPrefix: string;
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
          {t(`${labelPrefix}.${id}`)}
        </option>
      ))}
    </Select>
  );
}

export function ReservationsInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("module");
  const settings = draft.sectionSettings.reservations;

  function patch(patch: Partial<ReservationSettings>) {
    dispatch({ type: "patchSection", section: "reservations", patch });
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
          <NumberedHeading n={1} title={t("publicLink.reservations.reservationModule")} note={t("publicLink.reservations.reservationModuleNote")} />

          <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
            <ToggleRow
              label={t("publicLink.reservations.enableReservation")}
              note={t("publicLink.reservations.enableReservationNote")}
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
            {t("publicLink.reservations.moduleSetting")}
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

          <NumberedHeading n={3} title={t("publicLink.reservations.primaryActionReservation")} />
          <TargetSelect value={settings.primaryAction} onChange={(primaryAction) => patch({ primaryAction })} />

          <ToggleRow
            label={t("publicLink.reservations.availabilityPreview")}
            note={t("publicLink.reservations.availabilityPreviewNote")}
            checked={settings.availabilityPreview}
            onChange={() => patch({ availabilityPreview: !settings.availabilityPreview })}
          />

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label={t("publicLink.reservations.label")}>
              <Input
                placeholder={t("publicLink.reservations.showNextAvailable")}
                value={settings.nextAvailableLabel}
                onChange={(e) => patch({ nextAvailableLabel: e.target.value })}
              />
            </FieldRow>
            <FieldRow label={t("publicLink.reservations.dateRange")}>
              <OptionSelect
                value={settings.dateRange}
                options={DATE_RANGE_OPTIONS}
                labelPrefix="publicLink.reservations.dateRange"
                onChange={(dateRange) => patch({ dateRange })}
              />
            </FieldRow>
          </div>
        </div>
      )}

      {tab === "setting" && (
        <div className="flex flex-col gap-4">
          <FieldRow label={t("publicLink.reservations.bookingWindow")}>
            <OptionSelect
              value={settings.bookingWindow}
              options={BOOKING_WINDOW_OPTIONS}
              labelPrefix="publicLink.reservations.bookingWindow"
              onChange={(bookingWindow) => patch({ bookingWindow })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.reservations.cutOff")}>
            <OptionSelect
              value={settings.cutOff}
              options={CUT_OFF_OPTIONS}
              labelPrefix="publicLink.reservations.cutOff"
              onChange={(cutOff) => patch({ cutOff })}
            />
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

          <FieldRow label={t("publicLink.reservations.tableHold")}>
            <OptionSelect
              value={settings.tableHold}
              options={TABLE_HOLD_OPTIONS}
              labelPrefix="publicLink.reservations.tableHold"
              onChange={(tableHold) => patch({ tableHold })}
            />
          </FieldRow>

          <ToggleRow
            label={t("publicLink.reservations.autoConfirm")}
            note={t("publicLink.reservations.autoConfirmNote")}
            checked={settings.autoConfirm}
            onChange={() => patch({ autoConfirm: !settings.autoConfirm })}
          />

          <ToggleRow
            label={`${t("publicLink.reservations.deposit")} (${t("publicLink.hero.optional")})`}
            note={t("publicLink.reservations.depositNote")}
            checked={settings.deposit}
            onChange={() => patch({ deposit: !settings.deposit })}
          />
        </div>
      )}

      {tab === "policies" && (
        <div className="flex flex-col gap-4">
          <FieldRow label={t("publicLink.reservations.cancellationWindow")}>
            <OptionSelect
              value={settings.cancellationWindow}
              options={CANCELLATION_OPTIONS}
              labelPrefix="publicLink.reservations.cancellationWindow"
              onChange={(cancellationWindow) => patch({ cancellationWindow })}
            />
          </FieldRow>

          <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
            <ToggleRow
              label={t("publicLink.reservations.noShowFee")}
              note={t("publicLink.reservations.noShowFeeNote")}
              checked={settings.noShowFee}
              onChange={() => patch({ noShowFee: !settings.noShowFee })}
            />
            {settings.noShowFee && (
              <Input
                type="number"
                min={0}
                label={t("publicLink.reservations.noShowAmount")}
                placeholder="0"
                value={settings.noShowAmount}
                onChange={(e) => patch({ noShowAmount: e.target.value })}
              />
            )}
          </div>

          <FieldRow label={t("publicLink.reservations.depositRefund")}>
            <div className="flex flex-col gap-2">
              {REFUND_OPTIONS.map((id) => (
                <RadioCard
                  key={id}
                  title={t(`publicLink.reservations.depositRefund.${id}`)}
                  note={t(`publicLink.reservations.depositRefund.${id}Note`)}
                  selected={settings.depositRefund === id}
                  onSelect={() => patch({ depositRefund: id })}
                />
              ))}
            </div>
          </FieldRow>

          <FieldRow label={t("publicLink.reservations.terms")}>
            <Textarea
              rows={4}
              placeholder={t("publicLink.reservations.termsPlaceholder")}
              value={settings.termsText}
              onChange={(e) => patch({ termsText: e.target.value })}
            />
          </FieldRow>
        </div>
      )}

      {tab === "notifications" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.reservations.channels")}</p>
            <ToggleRow label={t("publicLink.waitlist.whatsapp")} checked={settings.notifyWhatsapp} onChange={() => patch({ notifyWhatsapp: !settings.notifyWhatsapp })} />
            <ToggleRow label={t("publicLink.waitlist.sms")} checked={settings.notifySms} onChange={() => patch({ notifySms: !settings.notifySms })} />
            <ToggleRow label={t("publicLink.waitlist.email")} checked={settings.notifyEmail} onChange={() => patch({ notifyEmail: !settings.notifyEmail })} />
          </div>

          <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
            <ToggleRow
              label={t("publicLink.reservations.reminder")}
              note={t("publicLink.reservations.reminderNote")}
              checked={settings.reminderEnabled}
              onChange={() => patch({ reminderEnabled: !settings.reminderEnabled })}
            />
            {settings.reminderEnabled && (
              <FieldRow label={t("publicLink.reservations.reminderBefore")}>
                <OptionSelect
                  value={settings.reminderBefore}
                  options={REMINDER_OPTIONS}
                  labelPrefix="publicLink.reservations.reminderBefore"
                  onChange={(reminderBefore) => patch({ reminderBefore })}
                />
              </FieldRow>
            )}
          </div>

          <ToggleRow
            label={t("publicLink.reservations.notifyStaff")}
            note={t("publicLink.reservations.notifyStaffNote")}
            checked={settings.notifyStaff}
            onChange={() => patch({ notifyStaff: !settings.notifyStaff })}
          />
        </div>
      )}
    </div>
  );
}
