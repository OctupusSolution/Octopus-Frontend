// The Reservations section's inspector. The frames give it four tabs — Module,
// Setting, Policies, Notifications — but only draw the first two; Policies and
// Notifications render the same `EmptyState` treatment hero-inspector.tsx uses
// for its own undrawn tabs.
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, EmptyState, Input, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { ReservationSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { CheckCard, FieldRow, NumberedHeading, ToggleRow, InspectorTabs } from "./controls";

const TARGET_IDS = ["reservations", "menu", "offers", "waitlist", "contact"] as const;

const BOOKING_WINDOW_OPTIONS = ["30", "60", "90"] as const;
const CUT_OFF_OPTIONS = ["1", "2", "4"] as const;
const TABLE_HOLD_OPTIONS = ["10", "15", "30"] as const;
const DATE_RANGE_OPTIONS = ["7", "14", "30"] as const;

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
      <option value="">{t("publicLink.reservations.primaryActionReservation")}</option>
      {TARGET_IDS.map((id) => (
        <option key={id} value={id}>
          {t(`publicLink.target.${id}`)}
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
              <Select value={settings.dateRange} onChange={(e) => patch({ dateRange: e.target.value })}>
                <option value="" />
                {DATE_RANGE_OPTIONS.map((id) => (
                  <option key={id} value={id}>
                    {t(`publicLink.reservations.dateRange.${id}`)}
                  </option>
                ))}
              </Select>
            </FieldRow>
          </div>
        </div>
      )}

      {tab === "setting" && (
        <div className="flex flex-col gap-4">
          <FieldRow label={t("publicLink.reservations.bookingWindow")}>
            <Select value={settings.bookingWindow} onChange={(e) => patch({ bookingWindow: e.target.value })}>
              <option value="" />
              {BOOKING_WINDOW_OPTIONS.map((id) => (
                <option key={id} value={id}>
                  {t(`publicLink.reservations.bookingWindow.${id}`)}
                </option>
              ))}
            </Select>
          </FieldRow>

          <FieldRow label={t("publicLink.reservations.cutOff")}>
            <Select value={settings.cutOff} onChange={(e) => patch({ cutOff: e.target.value })}>
              <option value="" />
              {CUT_OFF_OPTIONS.map((id) => (
                <option key={id} value={id}>
                  {t(`publicLink.reservations.cutOff.${id}`)}
                </option>
              ))}
            </Select>
          </FieldRow>

          <FieldRow label={t("publicLink.reservations.partySize")}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label={t("publicLink.reservations.min")}
                value={settings.minParty}
                onChange={(e) => patch({ minParty: e.target.value })}
              />
              <Input
                type="number"
                label={t("publicLink.reservations.max")}
                value={settings.maxParty}
                onChange={(e) => patch({ maxParty: e.target.value })}
              />
            </div>
          </FieldRow>

          <FieldRow label={t("publicLink.reservations.tableHold")}>
            <Select value={settings.tableHold} onChange={(e) => patch({ tableHold: e.target.value })}>
              <option value="" />
              {TABLE_HOLD_OPTIONS.map((id) => (
                <option key={id} value={id}>
                  {t(`publicLink.reservations.tableHold.${id}`)}
                </option>
              ))}
            </Select>
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

      {(tab === "policies" || tab === "notifications") && (
        <EmptyState title={t(tab === "policies" ? "publicLink.inspector.policies" : "publicLink.inspector.notifications")} description={t("publicLink.notBuiltYet")} />
      )}
    </div>
  );
}
