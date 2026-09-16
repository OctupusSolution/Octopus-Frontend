import { MODULES, type ModuleId } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { useStaffLabels } from "./_shared/labels";
import { MultiSelect } from "./_shared/multi-select";

export function ModulesSelect({ id, value, onChange }: { id: string; value: readonly ModuleId[]; onChange: (next: ModuleId[]) => void }) {
  const { t } = useI18n();
  const labels = useStaffLabels();
  return (
    <MultiSelect
      id={id}
      columns={2}
      options={MODULES.map((m) => ({ value: m.id, label: labels.moduleLabel(m.id) }))}
      value={value}
      onChange={(next) => onChange(next as ModuleId[])}
      placeholder={t("staff.member.modules.none")}
      selectAllLabel={t("staff.member.modules.selectAll")}
    />
  );
}
