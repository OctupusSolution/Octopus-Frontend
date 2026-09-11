import { useMemo } from "react";
import { staffRoleDefs, type ModuleId, type StaffRole } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const BUILT_IN_ROLES = new Map(staffRoleDefs.map((r) => [r.id as string, r]));

const STAFF_ROLE_KEY: Record<StaffRole, string> = {
  Owner: "staff.role.owner",
  "Branch Manager": "staff.role.branchManager",
  Cashier: "staff.role.cashier",
  Waiter: "staff.role.waiter",
  Kitchen: "staff.role.kitchen",
  Driver: "staff.role.driver",
};

export const PHONE_RE = /^\+?[0-9][0-9\s-]{7,}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mock records carry English strings. Seeded values (job titles, departments,
// built-in role names...) have dictionary entries; anything a merchant types
// in themselves is shown exactly as typed.
export function useStaffLabels() {
  const { t } = useI18n();
  return useMemo(() => {
    const maybe = (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    };
    return {
      data: (prefix: string, value: string) => (value ? maybe(`${prefix}.${slug(value)}`, value) : value),
      roleName: (role: { id: string; name: string }) => {
        const def = BUILT_IN_ROLES.get(role.id);
        return def && def.name === role.name ? maybe(`staff.roleDef.${role.id}.name`, role.name) : role.name;
      },
      roleDescription: (role: { id: string; description: string }) => {
        const def = BUILT_IN_ROLES.get(role.id);
        return def && def.description === role.description ? maybe(`staff.roleDef.${role.id}.description`, role.description) : role.description;
      },
      moduleLabel: (id: ModuleId) => t(`staff.module.${id}`),
      featureLabel: (id: string) => t(`staff.feature.${id}`),
      staffRole: (role: StaffRole) => t(STAFF_ROLE_KEY[role]),
    };
  }, [t]);
}
