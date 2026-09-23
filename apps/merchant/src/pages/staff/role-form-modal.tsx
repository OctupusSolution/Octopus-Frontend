import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createStaffRole, duplicateStaffRole } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { Field, SelectInput, TextArea, TextInput } from "./_shared/form";
import { useStaffLabels } from "./_shared/labels";
import { useStaffStore } from "./_shared/staff-store";
import { rememberRole, serverRoleId } from "./_shared/staff-sync";
import { newKey, staffErrorText, useTx, UUID_RE } from "./_shared/text";

export type RoleFormState = { mode: "add" } | { mode: "edit"; roleId: string } | null;

export function RoleFormModal({
  state,
  onClose,
  onSaved,
}: {
  state: RoleFormState;
  onClose: () => void;
  onSaved: (roleId: string, message: string) => void;
}) {
  const { t } = useI18n();
  const tx = useTx();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const { activeBusinessId } = useAuth();
  const [saving, setSaving] = useState(false);
  const editing = state?.mode === "edit" ? store.roles.find((r) => r.id === state.roleId) ?? null : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState("blank");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state) return;
    setName(editing ? labels.roleName(editing) : "");
    setDescription(editing ? labels.roleDescription(editing) : "");
    setCopyFrom("blank");
    setError("");
    setSaving(false);
    // Seed the fields each time the dialog opens for a (possibly different) role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("staff.validation.required"));
      return;
    }
    const taken = store.roles.some((r) => r.id !== editing?.id && labels.roleName(r).toLowerCase() === trimmed.toLowerCase());
    if (taken) {
      setError(t("staff.validation.roleNameTaken"));
      return;
    }

    if (editing) {
      // Leave the stored English name untouched when the merchant didn't change
      // the (translated) name shown to them, so it keeps translating.
      store.updateRole(editing.id, {
        name: trimmed === labels.roleName(editing) ? editing.name : trimmed,
        description: description.trim() === labels.roleDescription(editing) ? editing.description : description.trim(),
      });
      onSaved(editing.id, t("staff.toast.roleUpdated").replace("{name}", trimmed));
    } else {
      if (!activeBusinessId) return;
      // Created on the server straight away, so the permission matrix can open
      // on it. "Copy from" is POST /roles/{id}/duplicate: the copy starts with
      // the source role's permissions and no members.
      setSaving(true);
      try {
        const body = { name: trimmed, description: description.trim() || null };
        const res =
          copyFrom === "blank"
            ? await createStaffRole(activeBusinessId, body, newKey())
            : await duplicateStaffRole(activeBusinessId, serverRoleId(copyFrom), body, newKey());
        const role = rememberRole(res);
        store.adoptRole(role);
        onSaved(role.id, t("staff.toast.roleCreated").replace("{name}", trimmed));
      } catch (err) {
        setError(staffErrorText(err, tx));
        setSaving(false);
        return;
      }
    }
    onClose();
  };

  return (
    <Modal
      open={Boolean(state)}
      onClose={onClose}
      title={t(editing ? "staff.roles.editRoleTitle" : "staff.roles.addRoleTitle")}
      className="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>{t("common.cancel")}</button>
          <button type="button" onClick={() => void save()} disabled={saving} className={buttonClass("primary")}>
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {t(editing ? "staff.roles.saveRole" : "staff.roles.addRoleSave")}
          </button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4"
      >
        <Field label={t("staff.roles.addRoleName")} htmlFor="role-name" error={error}>
          <TextInput
            id="role-name"
            autoFocus
            value={name}
            invalid={!!error}
            placeholder={t("staff.roles.namePlaceholder")}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
        </Field>
        <Field label={t("staff.roles.addRoleDescription")} htmlFor="role-description">
          <TextArea
            id="role-description"
            rows={3}
            value={description}
            placeholder={t("staff.roles.descriptionPlaceholder")}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        {!editing && (
          <Field label={t("staff.roles.copyFrom")} htmlFor="role-copy" hint={t("staff.roles.copyFromHint")}>
            <SelectInput id="role-copy" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="blank">{t("staff.roles.startBlank")}</option>
              {store.roles
                .filter((r) => UUID_RE.test(serverRoleId(r.id)))
                .map((r) => (
                  <option key={r.id} value={r.id}>{labels.roleName(r)}</option>
                ))}
            </SelectInput>
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
