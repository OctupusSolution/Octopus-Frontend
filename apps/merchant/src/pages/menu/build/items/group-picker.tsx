// "Reuse existing group": the business's modifier groups (GET
// /menu/modifier-groups). Attaching links the same group to this item; the
// trash deletes a group for good (DELETE, detached from every item, checked
// against its `contentVersion`) after a confirm.
import { useEffect, useState } from "react";
import { Layers, Trash2 } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import type { ModifierGroupSummaryResponse } from "@octopus/api-client";
import { deleteGroupEverywhere, describeApiError, listReusableGroups } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";

export function GroupPicker({
  open,
  attachedIds,
  busy,
  onClose,
  onAttach,
  onDeleted,
}: {
  open: boolean;
  attachedIds: string[];
  busy: boolean;
  onClose: () => void;
  onAttach: (groupId: string) => void;
  onDeleted: (groupId: string) => void;
}) {
  const c = useMenuCopy();
  const { t, locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [rows, setRows] = useState<ModifierGroupSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ModifierGroupSummaryResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !activeBusinessId) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    listReusableGroups(activeBusinessId)
      .then((data) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setError(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, [open, activeBusinessId]);

  const name = (n: Record<string, string>) => n[locale] || n.en || n.ar || Object.values(n)[0] || "—";

  async function remove(group: ModifierGroupSummaryResponse) {
    if (!activeBusinessId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteGroupEverywhere(activeBusinessId, group);
      setRows((r) => (r ? r.filter((x) => x.id !== group.id) : r));
      onDeleted(group.id);
      setConfirm(null);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={c("groups.reuseTitle")} className="max-w-[540px]">
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{c("groups.reuseHint")}</p>
      {error && (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}
      <ul className="mt-3 max-h-[48vh] space-y-2 overflow-y-auto">
        {rows === null && !error ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("loading")}</li>
        ) : (rows ?? []).length === 0 ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("empty")}</li>
        ) : (
          (rows ?? []).map((g) => {
            const attached = attachedIds.includes(g.id);
            return (
              <li key={g.id} className="rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Layers size={16} className="shrink-0 text-[var(--octo-text-muted)]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-[var(--octo-text-primary)]">{name(g.name)}</p>
                    <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                      {t(g.selectionMode.toLowerCase() === "single" ? "menuWiz.mod.single" : "menuWiz.mod.multi")} ·{" "}
                      {c("groups.options", { n: g.optionCount })}
                    </p>
                  </div>
                  <Button size="sm" variant={attached ? "ghost" : "primary"} disabled={attached || busy} onClick={() => onAttach(g.id)}>
                    {attached ? c("groups.attached") : c("groups.attach")}
                  </Button>
                  <button
                    type="button"
                    aria-label={`${c("groups.deleteForever")} ${name(g.name)}`}
                    onClick={() => setConfirm(g)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-error hover:bg-error/10"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {confirm?.id === g.id && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-error/10 px-3 py-2">
                    <p className="text-[12px] text-error">{c("groups.confirmDelete", { name: name(g.name) })}</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>
                        {c("cancel")}
                      </Button>
                      <Button size="sm" variant="danger" disabled={deleting} onClick={() => void remove(g)}>
                        {c("delete")}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </Modal>
  );
}
