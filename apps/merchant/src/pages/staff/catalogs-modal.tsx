// Job titles and departments: the business's own lists behind the member
// form's "Position" and "Department" fields (GET/POST /job-titles,
// PUT/DELETE /job-titles/{id}, and the same for /departments). Neither grants
// anything — only a role does.
import { useState } from "react";
import {
  createStaffDepartment,
  createStaffJobTitle,
  deleteStaffDepartment,
  deleteStaffJobTitle,
  updateStaffDepartment,
  updateStaffJobTitle,
} from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { CatalogEditor, type CatalogApi } from "./_shared/catalog-editor";
import { PageTabs } from "./_shared/page-tabs";
import { useStaffStore } from "./_shared/staff-store";
import { useTx } from "./_shared/text";

type CatalogTab = "jobTitles" | "departments";

const JOB_TITLES_API: CatalogApi = { create: createStaffJobTitle, update: updateStaffJobTitle, remove: deleteStaffJobTitle };
const DEPARTMENTS_API: CatalogApi = { create: createStaffDepartment, update: updateStaffDepartment, remove: deleteStaffDepartment };

export function CatalogsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tx = useTx();
  const store = useStaffStore();
  const [tab, setTab] = useState<CatalogTab>("jobTitles");

  return (
    <Modal open={open} onClose={onClose} title={tx("Job titles & departments", "المسميات الوظيفية والأقسام")} className="max-w-2xl">
      <p className="-mt-1 mb-3 text-[13px] text-[var(--octo-text-secondary)]">
        {tx(
          "These lists fill the Position and Department fields on every member. They describe the job — access comes from the member's role.",
          "تُستخدم هذه القوائم في حقلي المسمى الوظيفي والقسم لكل موظف. هي وصف للوظيفة فقط — الصلاحيات تأتي من دور الموظف."
        )}
      </p>
      <PageTabs
        size="md"
        ariaLabel={tx("Catalog", "القائمة")}
        value={tab}
        onChange={setTab}
        items={[
          { id: "jobTitles", label: `${tx("Job titles", "المسميات الوظيفية")} (${store.jobTitles.length})` },
          { id: "departments", label: `${tx("Departments", "الأقسام")} (${store.departments.length})` },
        ]}
      />
      <div className="mt-4">
        {tab === "jobTitles" ? (
          <CatalogEditor
            key="jobTitles"
            rows={store.jobTitles}
            api={JOB_TITLES_API}
            onChanged={store.reloadCatalogs}
            loading={!store.catalogsLoaded}
            addLabel={tx("Add title", "إضافة مسمى")}
            emptyText={tx("No job titles yet. Add the positions your team works in (Waiter, Cashier, Chef…).", "لا توجد مسميات وظيفية بعد. أضف وظائف فريقك (نادل، كاشير، طاهٍ…).")}
          />
        ) : (
          <CatalogEditor
            key="departments"
            rows={store.departments}
            api={DEPARTMENTS_API}
            onChanged={store.reloadCatalogs}
            loading={!store.catalogsLoaded}
            addLabel={tx("Add department", "إضافة قسم")}
            emptyText={tx("No departments yet. Add areas such as Front of House or Kitchen.", "لا توجد أقسام بعد. أضف أقسامًا مثل الصالة أو المطبخ.")}
          />
        )}
      </div>
    </Modal>
  );
}
