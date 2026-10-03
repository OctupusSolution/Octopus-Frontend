import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BriefcaseBusiness, Settings } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { PageTabs } from "./_shared/page-tabs";
import { StaffStoreProvider, useStaffStore } from "./_shared/staff-store";
import { buttonClass } from "./_shared/buttons";
import { StaffIcon } from "./_shared/icon";
import { StaffTab } from "./staff-tab";
import { RolesPermissionsTab } from "./roles-permissions-tab";
import { ShiftsTab, type ShiftsDialog, type ShiftsSubTab } from "./shifts-tab";
import { StaffSettingsModal } from "./shifts/staff-settings-modal";
import { CatalogsModal } from "./catalogs-modal";
import { useTx } from "./_shared/text";

type TabId = "staff" | "roles" | "shifts";
const TAB_IDS: readonly TabId[] = ["staff", "roles", "shifts"];

// Job titles & departments and the shift settings are real features the frames
// give no button to, so they sit beside the frames' own actions as a square
// icon-only button of the same height.
const ICON_BUTTON = "w-12 px-0";

export function StaffPage() {
  return (
    <StaffStoreProvider>
      <StaffPageContent />
    </StaffStoreProvider>
  );
}

function StaffPageContent() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") as TabId | null;
  const tab: TabId = requested && TAB_IDS.includes(requested) ? requested : "staff";
  const [addOpen, setAddOpen] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [shiftsSub, setShiftsSub] = useState<ShiftsSubTab>("schedule");
  const [shiftsDialog, setShiftsDialog] = useState<ShiftsDialog>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [catalogsOpen, setCatalogsOpen] = useState(false);
  const tx = useTx();
  const store = useStaffStore();
  const hasShiftRoles = store.shiftRoles.length > 0;

  const header: Record<TabId, { title: string; subtitle: string }> = {
    staff: { title: t("staff.header.title"), subtitle: t("staff.header.subtitle") },
    roles: { title: t("staff.roles.pageTitle"), subtitle: t("staff.roles.pageSubtitle") },
    shifts: { title: t("staff.shiftsTab.title"), subtitle: t("staff.shiftsTab.subtitle") },
  };

  const changeTab = (id: TabId) => {
    // Re-selecting "Staff" is how a merchant gets from a member profile back
    // to the team grid — the designs give the profile no back link of its own.
    if (id === "staff") setMemberId(null);
    const next = new URLSearchParams(params);
    if (id === "staff") next.delete("tab");
    else next.set("tab", id);
    setParams(next);
  };

  const importCsvKey = "staff.header.importCsv";
  const importCsv = t(importCsvKey);
  const catalogsLabel = tx("Job titles & departments", "المسميات والأقسام");

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8">
      {store.syncError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-[8px] bg-[#fef0f0] px-4 py-2.5 text-[14px] text-[#d30202] [[data-theme=dark]_&]:bg-[#d30202]/20 [[data-theme=dark]_&]:text-[#f87171]">
          <span>{store.syncError}</span>
          <button type="button" className="shrink-0 underline" onClick={store.dismissSyncError}>
            OK
          </button>
        </div>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-[24px] font-bold leading-6 text-[var(--octo-text-primary)]">{header[tab].title}</h1>
          <p className="text-[14px] font-medium leading-[14px] text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]">{header[tab].subtitle}</p>
        </div>
        {tab === "staff" && (
          <div className="flex flex-wrap items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => setCatalogsOpen(true)}
              aria-label={catalogsLabel}
              title={catalogsLabel}
              className={buttonClass("outline", "lg", ICON_BUTTON)}
            >
              <BriefcaseBusiness size={24} strokeWidth={1.5} />
            </button>
            {/* Drawn in the frames, but there is no staff import endpoint yet — inert, like the CRM's. */}
            {!memberId && (
              <button type="button" disabled className={buttonClass("outline", "lg", "disabled:opacity-100")}>
                <StaffIcon name="staff-import.svg" size={24} className="text-[#0058da]" />
                {importCsv === importCsvKey ? "Import CSV" : importCsv}
              </button>
            )}
            <button type="button" onClick={() => setAddOpen(true)} className={buttonClass("primary", "lg")}>
              <StaffIcon name="crm-plus.svg" size={24} />
              {t("staff.header.addNewMember")}
            </button>
          </div>
        )}
        {tab === "shifts" && shiftsSub === "schedule" && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("staff.settings.title")}
              title={t("staff.settings.title")}
              className={buttonClass("outline", "lg", ICON_BUTTON)}
            >
              <Settings size={24} strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => setShiftsDialog("bulkAssign")} className={buttonClass("outline", "lg")}>
              {t("staff.shiftsTab.bulkAssignShift")}
            </button>
            <button type="button" onClick={() => setShiftsDialog("assign")} className={buttonClass("primary", "lg")}>
              {t("staff.assignShift.submit")}
            </button>
          </div>
        )}
        {tab === "shifts" && shiftsSub === "shiftRoles" && hasShiftRoles && (
          <button type="button" onClick={() => setShiftsDialog("addShiftRole")} className={buttonClass("primary", "lg")}>
            <StaffIcon name="crm-plus.svg" size={24} />
            {t("staff.shiftRoles.add")}
          </button>
        )}
        {tab === "shifts" && shiftsSub === "timeOff" && (
          <button type="button" onClick={() => setShiftsDialog("addTimeOff")} className={buttonClass("primary", "lg")}>
            <StaffIcon name="crm-plus.svg" size={24} />
            {t("staff.timeOff.add")}
          </button>
        )}
      </header>

      {/* The Shifts frames draw only their own row (Schedule / Shift Roles / …);
          this one stays above it so Staff and Roles remain one click away. */}
      <PageTabs
        className="mt-8"
        ariaLabel={t("staff.tabs.ariaLabel")}
        value={tab}
        onChange={changeTab}
        items={[
          { id: "staff", label: t("staff.tabs.staff") },
          { id: "roles", label: t("staff.tabs.rolesPermissions") },
          { id: "shifts", label: t("staff.tabs.shifts") },
        ]}
      />

      <div className={tab === "staff" && memberId ? "mt-6" : tab === "shifts" ? "mt-6" : "mt-4"}>
        {tab === "staff" && (
          <StaffTab addOpen={addOpen} onAddOpenChange={setAddOpen} selectedId={memberId} onSelect={setMemberId} />
        )}
        {tab === "roles" && <RolesPermissionsTab />}
        {tab === "shifts" && (
          <ShiftsTab
            sub={shiftsSub}
            onSubChange={(sub) => {
              setShiftsSub(sub);
              setShiftsDialog(null);
            }}
            dialog={shiftsDialog}
            onDialogChange={setShiftsDialog}
            onViewProfile={(id) => {
              setMemberId(id);
              const next = new URLSearchParams(params);
              next.delete("tab");
              setParams(next);
            }}
          />
        )}
      </div>

      <StaffSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CatalogsModal open={catalogsOpen} onClose={() => setCatalogsOpen(false)} />
    </div>
  );
}
