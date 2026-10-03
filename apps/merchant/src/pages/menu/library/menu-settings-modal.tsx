// Menu settings, opened from the library header: the branch time zones the
// scheduler reads (GET/PUT /menu/branches) and the business's labels.
//
// The Menu module only knows branches by id — there is still no endpoint that
// names them (BACKEND_GAPS 0.1) — so a branch is shown by the seed label when
// its id matches one, otherwise by its id.
import { useEffect, useMemo, useState } from "react";
import { Clock3, Settings2 } from "lucide-react";
import { Button, Modal, Segmented } from "@ui/primitives";
import { SEED_BRANCHES, describeApiError, invalidateMenuResource, setBranchTimeZone, useBranchTimeZones } from "@/entities/menu";
import { LabelsManager } from "../labels-manager";
import { useMenuCopy } from "../copy";

const input =
  "w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[13.5px] text-[var(--octo-text-primary)]";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function timeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    return intl.supportedValuesOf?.("timeZone") ?? ["Asia/Riyadh", "UTC"];
  } catch {
    return ["Asia/Riyadh", "UTC"];
  }
}

function BranchRow({ branchId, timeZoneId }: { branchId: string; timeZoneId: string }) {
  const c = useMenuCopy();
  const { businessId } = useBranchTimeZones(false);
  const [value, setValue] = useState(timeZoneId);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValue(timeZoneId), [timeZoneId]);
  const label = SEED_BRANCHES.find((b) => b.id === branchId)?.label;

  async function save() {
    if (!businessId || !value.trim()) return;
    setState("saving");
    setError(null);
    try {
      await setBranchTimeZone(businessId, branchId, value.trim());
      setState("saved");
      invalidateMenuResource("branches");
    } catch (err) {
      setError(describeApiError(err));
      setState("idle");
    }
  }

  return (
    <li className="rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
      <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0">
          {label && <p className="truncate text-[13.5px] font-medium text-[var(--octo-text-primary)]">{label}</p>}
          <p dir="ltr" className="truncate text-start text-[11.5px] text-[var(--octo-text-muted)]">
            {branchId}
          </p>
        </div>
        <input
          aria-label={c("settings.branches.timeZone")}
          list="menu-time-zones"
          dir="ltr"
          className={input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState("idle");
          }}
        />
        <Button size="sm" disabled={state === "saving" || value === timeZoneId || !value.trim()} onClick={() => void save()}>
          {state === "saving" ? c("saving") : state === "saved" ? c("settings.branches.saved") : c("save")}
        </Button>
      </div>
      {error && <p role="alert" className="mt-1.5 text-[12px] text-error">{error}</p>}
    </li>
  );
}

function BranchesTab() {
  const c = useMenuCopy();
  const branches = useBranchTimeZones();
  const zones = useMemo(timeZones, []);
  const [adding, setAdding] = useState({ branchId: "", timeZoneId: "Asia/Riyadh" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!branches.businessId) return;
    setBusy(true);
    setError(null);
    try {
      await setBranchTimeZone(branches.businessId, adding.branchId.trim(), adding.timeZoneId.trim());
      invalidateMenuResource("branches");
      setAdding({ branchId: "", timeZoneId: adding.timeZoneId });
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const rows = branches.data ?? [];
  return (
    <div>
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{c("settings.branches.hint")}</p>
      <datalist id="menu-time-zones">
        {zones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>

      {(error || branches.error) && (
        <p role="alert" className="mt-3 flex items-center justify-between gap-2 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          <span>{error ?? branches.error}</span>
          {branches.error && !error && (
            <button type="button" className="underline" onClick={branches.refresh}>
              {c("retry")}
            </button>
          )}
        </p>
      )}

      <ul className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto">
        {branches.loading && !branches.data ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("loading")}</li>
        ) : rows.length === 0 ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("settings.branches.empty")}</li>
        ) : (
          rows.map((b) => <BranchRow key={b.branchId} branchId={b.branchId} timeZoneId={b.timeZoneId} />)
        )}
      </ul>

      <div className="mt-3 grid gap-2 border-t border-[var(--octo-divider)] pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input
          aria-label={c("settings.branches.branchId")}
          placeholder={c("settings.branches.branchId")}
          dir="ltr"
          className={input}
          value={adding.branchId}
          onChange={(e) => setAdding({ ...adding, branchId: e.target.value })}
        />
        <input
          aria-label={c("settings.branches.timeZone")}
          list="menu-time-zones"
          dir="ltr"
          className={input}
          value={adding.timeZoneId}
          onChange={(e) => setAdding({ ...adding, timeZoneId: e.target.value })}
        />
        <Button
          disabled={busy || !GUID.test(adding.branchId.trim()) || !adding.timeZoneId.trim()}
          onClick={() => void add()}
          icon={<Clock3 size={15} aria-hidden />}
        >
          {c("settings.branches.add")}
        </Button>
      </div>
    </div>
  );
}

export function MenuSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useMenuCopy();
  const [tab, setTab] = useState<"branches" | "labels">("branches");
  if (!open) return null;
  return (
    <Modal open onClose={onClose} className="max-w-[640px]">
      <div className="flex items-center gap-2.5">
        <Settings2 size={20} className="text-[var(--octo-text-secondary)]" aria-hidden />
        <h2 className="text-[18px] font-semibold text-[var(--octo-text-primary)]">{c("settings.title")}</h2>
      </div>
      <Segmented
        className="mt-3"
        value={tab}
        onChange={(v) => setTab(v as "branches" | "labels")}
        options={[
          { id: "branches", label: c("settings.tab.branches") },
          { id: "labels", label: c("settings.tab.labels") },
        ]}
      />
      <div className="mt-4">{tab === "branches" ? <BranchesTab /> : <LabelsManager />}</div>
    </Modal>
  );
}
