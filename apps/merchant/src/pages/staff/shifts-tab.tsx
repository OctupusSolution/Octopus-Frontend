import { useState } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { PageTabs } from "./_shared/page-tabs";
import { AvailabilityView } from "./shifts/availability-view";
import { ScheduleView } from "./shifts/schedule-view";
import { ShiftRolesView } from "./shifts/shift-roles-view";
import { TemplatesView } from "./shifts/templates-view";
import { TimeOffView } from "./shifts/time-off-view";

type SubTab = "schedule" | "templates" | "shiftRoles" | "timeOff" | "availability";

export function ShiftsTab() {
  const { t } = useI18n();
  const [sub, setSub] = useState<SubTab>("schedule");

  return (
    <div>
      <PageTabs
        size="md"
        ariaLabel={t("staff.shiftsTab.subnavAria")}
        value={sub}
        onChange={setSub}
        items={[
          { id: "schedule", label: t("staff.shiftsTab.subnav.schedule") },
          { id: "templates", label: t("staff.shiftsTab.subnav.templates") },
          { id: "shiftRoles", label: t("staff.shiftsTab.subnav.shiftRoles") },
          { id: "timeOff", label: t("staff.shiftsTab.subnav.timeOff") },
          { id: "availability", label: t("staff.shiftsTab.subnav.availability") },
        ]}
      />
      <div className="mt-6">
        {sub === "schedule" && <ScheduleView />}
        {sub === "templates" && <TemplatesView />}
        {sub === "shiftRoles" && <ShiftRolesView />}
        {sub === "timeOff" && <TimeOffView />}
        {sub === "availability" && <AvailabilityView />}
      </div>
    </div>
  );
}
