import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarPlus, Plus } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { PageTabs } from "./_shared/page-tabs";
import { StaffStoreProvider, useStaffStore } from "./_shared/staff-store";
import { buttonClass } from "./_shared/buttons";
import { StaffTab } from "./staff-tab";
import { RolesPermissionsTab } from "./roles-permissions-tab";
import { ShiftsTab, type ShiftsDialog, type ShiftsSubTab } from "./shifts-tab";

type TabId = "staff" | "roles" | "shifts";
const TAB_IDS: readonly TabId[] = ["staff", "roles", "shifts"];

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
  const hasShiftRoles = useStaffStore().shiftRoles.length > 0;

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

  return (
    <div className="px-4 pb-10 pt-5 sm:px-[26px]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[24px]">{header[tab].title}</h1>
          <p className="mt-1.5 text-[14px] text-[var(--octo-text-secondary)]">{header[tab].subtitle}</p>
        </div>
        {tab === "staff" && (
          <button type="button" onClick={() => setAddOpen(true)} className={buttonClass("primary", "lg")}>
            <Plus size={20} strokeWidth={2.5} />
            {t("staff.header.addNewMember")}
          </button>
        )}
        {tab === "shifts" && shiftsSub === "schedule" && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setShiftsDialog("bulkAssign")} className={buttonClass("outline", "lg")}>
              <CalendarPlus size={20} />
              {t("staff.shiftsTab.bulkAssignShift")}
            </button>
            <button type="button" onClick={() => setShiftsDialog("assign")} className={buttonClass("primary", "lg")}>
              <Plus size={20} strokeWidth={2.5} />
              {t("staff.assignShift.submit")}
            </button>
          </div>
        )}
        {tab === "shifts" && shiftsSub === "shiftRoles" && hasShiftRoles && (
          <button type="button" onClick={() => setShiftsDialog("addShiftRole")} className={buttonClass("primary", "lg")}>
            <Plus size={20} strokeWidth={2.5} />
            {t("staff.shiftRoles.add")}
          </button>
        )}
        {tab === "shifts" && shiftsSub === "timeOff" && (
          <button type="button" onClick={() => setShiftsDialog("addTimeOff")} className={buttonClass("primary", "lg")}>
            <Plus size={20} strokeWidth={2.5} />
            {t("staff.timeOff.add")}
          </button>
        )}
      </header>

      <PageTabs
        className="mt-6"
        ariaLabel={t("staff.tabs.ariaLabel")}
        value={tab}
        onChange={changeTab}
        items={[
          { id: "staff", label: t("staff.tabs.staff") },
          { id: "roles", label: t("staff.tabs.rolesPermissions") },
          { id: "shifts", label: t("staff.tabs.shifts") },
        ]}
      />

      <div className="mt-6">
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
    </div>
  );
}
