// Role pickers read GET /roles/assignable: the active roles a member may be
// given, visible to anyone holding staff.members.access (a branch supervisor
// can assign a role without being able to read the permission matrix). Until it
// answers — or if it is refused — the pickers fall back to the active roles the
// store already holds, so they are never empty for an owner.
import { useEffect, useMemo, useState } from "react";
import { listAssignableStaffRoles, type AssignableRoleResponse } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useStaffStore, type RoleRecord } from "./staff-store";

export function useAssignableRoles(currentRoleId?: string): RoleRecord[] {
  const { activeBusinessId } = useAuth();
  const store = useStaffStore();
  const [assignable, setAssignable] = useState<AssignableRoleResponse[] | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    listAssignableStaffRoles(activeBusinessId)
      .then((rows) => !cancelled && setAssignable(rows))
      .catch(() => !cancelled && setAssignable(null));
    return () => {
      cancelled = true;
    };
    // Re-read when the role list changes (created, renamed, (de)activated).
  }, [activeBusinessId, store.roles]);

  return useMemo(() => {
    const known = new Map(store.roles.map((r) => [r.id, r]));
    const base: RoleRecord[] = assignable
      ? assignable.map((a) => known.get(a.id) ?? { id: a.id, name: a.name, description: a.description ?? "", isSystemRole: false, active: true })
      : store.roles.filter((r) => r.active);
    // A member keeps showing the role they hold even once it stops being assignable.
    if (currentRoleId && !base.some((r) => r.id === currentRoleId)) {
      const current = known.get(currentRoleId);
      if (current) return [current, ...base];
    }
    return base;
  }, [assignable, store.roles, currentRoleId]);
}
