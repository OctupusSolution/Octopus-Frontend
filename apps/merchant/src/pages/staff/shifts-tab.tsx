import { useI18n } from "@/app/providers/i18n-provider";
import { PageTabs } from "./_shared/page-tabs";
import { AvailabilityView } from "./shifts/availability-view";
import { ScheduleView } from "./shifts/schedule-view";
import { ShiftRolesView } from "./shifts/shift-roles-view";
import { TimeOffView } from "./shifts/time-off-view";

export type ShiftsSubTab = "schedule" | "shiftRoles" | "timeOff" | "availability";
export type ShiftsDialog = "assign" | "bulkAssign" | "addShiftRole" | "addTimeOff" | null;

// The page header owns the Shifts actions (Assign Shift, Add Shift Role, Add
// Time Off) per the frames, so the open dialog is lifted up to it.
export function ShiftsTab({
  sub,
  onSubChange,
  dialog,
  onDialogChange,
  onViewProfile,
}: {
  sub: ShiftsSubTab;
  onSubChange: (sub: ShiftsSubTab) => void;
  dialog: ShiftsDialog;
  onDialogChange: (dialog: ShiftsDialog) => void;
  onViewProfile: (employeeId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div>
      <PageTabs
        size="md"
        ariaLabel={t("staff.shiftsTab.subnavAria")}
        value={sub}
        onChange={onSubChange}
        items={[
          { id: "schedule", label: t("staff.shiftsTab.subnav.schedule") },
          { id: "shiftRoles", label: t("staff.shiftsTab.subnav.shiftRoles") },
          { id: "timeOff", label: t("staff.shiftsTab.subnav.timeOff") },
          { id: "availability", label: t("staff.shiftsTab.subnav.availability") },
        ]}
      />
      <div className="mt-6">
        {sub === "schedule" && (
          <ScheduleView
            dialog={dialog === "assign" || dialog === "bulkAssign" ? dialog : null}
            onDialogChange={onDialogChange}
          />
        )}
        {sub === "shiftRoles" && (
          <ShiftRolesView addOpen={dialog === "addShiftRole"} onAddOpenChange={(open) => onDialogChange(open ? "addShiftRole" : null)} />
        )}
        {sub === "timeOff" && (
          <TimeOffView addOpen={dialog === "addTimeOff"} onAddOpenChange={(open) => onDialogChange(open ? "addTimeOff" : null)} />
        )}
        {sub === "availability" && <AvailabilityView onViewProfile={onViewProfile} onOpenSchedule={() => onSubChange("schedule")} />}
      </div>
    </div>
  );
}
