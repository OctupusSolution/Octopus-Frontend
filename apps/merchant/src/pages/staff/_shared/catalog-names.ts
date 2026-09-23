import { useMemo } from "react";
import { useStaffLabels } from "./labels";
import { useStaffStore } from "./staff-store";
import { useLocalName } from "./text";

/** A member's job title / department is the id of a catalog row; this reads it back as a name. */
export function useCatalogNames() {
  const store = useStaffStore();
  const labels = useStaffLabels();
  const localName = useLocalName();
  return useMemo(() => {
    const titles = new Map(store.jobTitles.map((r) => [r.id, r]));
    const depts = new Map(store.departments.map((r) => [r.id, r]));
    return {
      jobTitle: (id: string) => (titles.has(id) ? localName(titles.get(id)) : labels.data("staff.jobTitle", id)),
      department: (id: string) => (depts.has(id) ? localName(depts.get(id)) : labels.data("staff.department", id)),
    };
  }, [store.jobTitles, store.departments, labels, localName]);
}
