import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Tabs } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { StaffTab } from "./staff-tab";
import { RolesPermissionsTab } from "./roles-permissions-tab";
import { ShiftsTab } from "./shifts-tab";

type TabId = "staff" | "roles" | "shifts";

export function StaffPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("staff");

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("staff.header.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("staff.header.subtitle")}</p>
        </div>
        {tab === "staff" && (
          <Button variant="primary" icon={<Plus size={15} />}>
            {t("staff.header.addNewMember")}
          </Button>
        )}
      </header>

      <Tabs
        className="mt-4"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        items={[
          { id: "staff", label: t("staff.tabs.staff") },
          { id: "roles", label: t("staff.tabs.rolesPermissions") },
          { id: "shifts", label: t("staff.tabs.shifts") },
        ]}
      />

      {tab === "staff" && <StaffTab />}
      {tab === "roles" && <RolesPermissionsTab />}
      {tab === "shifts" && <ShiftsTab />}
    </div>
  );
}
