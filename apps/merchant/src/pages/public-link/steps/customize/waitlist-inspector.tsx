// The Waiting List section's inspector. Same four-tab shape as Reservations
// (Module, Setting, Policies, Notifications), but only Setting is drawn in
// full — Module mirrors Reservations' enable card with the waitlist drawer as
// its fixed primary action, so it reuses Reservations' `moduleActive` /
// `moduleSetting` copy rather than duplicating it under its own keys.
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, EmptyState, Input, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { SiteAction, SiteDraft, WaitlistSettings } from "../../_shared/site-draft";
import { FieldRow, NumberedHeading, RadioCard, ToggleRow, InspectorTabs } from "./controls";

const UPDATE_INTERVAL_OPTIONS = ["5", "10", "15"] as const;
const AUTO_REMOVE_OPTIONS = ["10", "20", "30"] as const;
const FORMAT_OPTIONS = ["30min", "1h"] as const;

const TABS = [
  { id: "module", labelKey: "publicLink.inspector.module" },
  { id: "setting", labelKey: "publicLink.inspector.setting" },
  { id: "policies", labelKey: "publicLink.inspector.policies" },
  { id: "notifications", labelKey: "publicLink.inspector.notifications" },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
          <NumberedHeading n={1} title={t("publicLink.waitlist.waitlistModule")} />

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

          <ToggleRow
            label={t("publicLink.waitlist.waitTimeDisplay")}
            note={t("publicLink.waitlist.waitTimeDisplayNote")}
            checked={settings.showWaitTime}
            onChange={() => patch({ showWaitTime: !settings.showWaitTime })}
          />

          {settings.showWaitTime && (
            <FieldRow label={t("publicLink.waitlist.format")}>
              <Select value={settings.format} onChange={(e) => patch({ format: e.target.value })}>
                <option value="" />
                {FORMAT_OPTIONS.map((id) => (
                  <option key={id} value={id}>
                    {t(`publicLink.waitlist.format.${id}`)}
                  </option>
                ))}
              </Select>
            </FieldRow>
          )}

          <FieldRow label={t("publicLink.waitlist.updateInterval")}>
            <Select value={settings.updateInterval} onChange={(e) => patch({ updateInterval: e.target.value })}>
              <option value="" />
              {UPDATE_INTERVAL_OPTIONS.map((id) => (
                <option key={id} value={id}>
                  {t(`publicLink.waitlist.updateInterval.${id}`)}
                </option>
              ))}
            </Select>
          </FieldRow>

          <div className="flex flex-col gap-2.5">
            <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.waitlist.notifications")}</p>
            <ToggleRow label={t("publicLink.waitlist.whatsapp")} checked={settings.notifyWhatsapp} onChange={() => patch({ notifyWhatsapp: !settings.notifyWhatsapp })} />
            <ToggleRow label={t("publicLink.waitlist.sms")} checked={settings.notifySms} onChange={() => patch({ notifySms: !settings.notifySms })} />
            <ToggleRow label={t("publicLink.waitlist.email")} checked={settings.notifyEmail} onChange={() => patch({ notifyEmail: !settings.notifyEmail })} />
          </div>

          <FieldRow label={t("publicLink.waitlist.autoRemove")}>
            <>
              <Select value={settings.autoRemove} onChange={(e) => patch({ autoRemove: e.target.value })}>
                <option value="" />
                {AUTO_REMOVE_OPTIONS.map((id) => (
                  <option key={id} value={id}>
                    {t(`publicLink.waitlist.autoRemove.${id}`)}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.waitlist.autoRemoveNote")}</p>
            </>
          </FieldRow>
        </div>
      )}

      {(tab === "policies" || tab === "notifications") && (
        <EmptyState title={t(tab === "policies" ? "publicLink.inspector.policies" : "publicLink.inspector.notifications")} description={t("publicLink.notBuiltYet")} />
      )}
    </div>
  );
}
