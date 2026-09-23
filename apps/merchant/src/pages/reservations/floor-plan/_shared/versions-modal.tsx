// Publish history for the active floor plan. Two ways back to an old version:
// "Restore to draft" brings it back as the draft so the merchant reviews it in
// the editor first (the posture Public Link's history takes), and "Make live"
// rolls the live floor straight back to it, leaving the draft alone. "View"
// opens the version as it was published: its zones, tables and notes.
import { useEffect, useState } from "react";
import { ChevronDown, Eye, History, Rocket, RotateCcw, X } from "lucide-react";
import clsx from "clsx";
import type { FloorPlanVersionDocumentResponse, FloorPlanVersionResponse } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAdminText } from "./admin-text";
import { errorText } from "./api-error";
import { TextAreaField } from "./fields";
import { formatDateTime, formatNumber } from "./format";

type Detail = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; doc: FloorPlanVersionDocumentResponse };

export function FloorPlanVersionsModal({
  open,
  onClose,
  listVersions,
  onRestore,
  getVersion,
  onRollback,
}: {
  open: boolean;
  onClose: () => void;
  listVersions: () => Promise<FloorPlanVersionResponse[]>;
  onRestore: (version: number) => Promise<void>;
  getVersion: (version: number) => Promise<FloorPlanVersionDocumentResponse>;
  onRollback: (version: number, notes: string) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const at = useAdminText();
  const [versions, setVersions] = useState<FloorPlanVersionResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, Detail>>({});
  const [rollback, setRollback] = useState<{ version: number; notes: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) {
      setVersions(null);
      setError(null);
      setDone(null);
      setExpanded(null);
      setDetails({});
      setRollback(null);
      return;
    }
    let cancelled = false;
    listVersions()
      .then((rows) => {
        if (!cancelled) setVersions(rows);
      })
      .catch(() => {
        if (!cancelled) setError(t("floorPlan.versions.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [open, listVersions, t, reloadKey]);

  async function restore(version: number) {
    setBusy(version);
    setError(null);
    try {
      await onRestore(version);
      setDone(t("floorPlan.versions.restored"));
    } catch {
      setError(t("floorPlan.versions.restoreFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function makeLive() {
    if (!rollback) return;
    const { version, notes } = rollback;
    setBusy(version);
    setError(null);
    try {
      await onRollback(version, notes);
      setRollback(null);
      setDone(at("versions.rolledBack", { n: version }));
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(`${at("versions.rollbackFailed")} ${errorText(err, at)}`);
    } finally {
      setBusy(null);
    }
  }

  function toggle(version: number) {
    if (expanded === version) {
      setExpanded(null);
      return;
    }
    setExpanded(version);
    if (details[version]?.state === "ready") return;
    setDetails((d) => ({ ...d, [version]: { state: "loading" } }));
    getVersion(version)
      .then((doc) => setDetails((d) => ({ ...d, [version]: { state: "ready", doc } })))
      .catch((err) => setDetails((d) => ({ ...d, [version]: { state: "error", message: `${at("versions.detailFailed")} ${errorText(err, at)}` } })));
  }

  const action =
    "flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Modal open={open} onClose={onClose} className="max-w-[620px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <History size={20} className="text-[var(--octo-text-secondary)]" />
          <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.versions.title")}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("floorPlan.common.close")}
          className="-me-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
        >
          <X size={16} />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}
      {done && !error && (
        <p role="status" className="mt-3 rounded-[9px] bg-[var(--octo-tone-success-bg)] px-3 py-2 text-[12.5px] text-[var(--octo-tone-success-text)]">
          {done}
        </p>
      )}

      <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
        {versions === null ? (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("floorPlan.versions.loading")}</p>
        ) : versions.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("floorPlan.versions.empty")}</p>
        ) : (
          versions
            .slice()
            .sort((a, b) => b.version - a.version)
            .map((v) => {
              const detail = details[v.version];
              const isOpen = expanded === v.version;
              return (
                <div key={v.id} className="rounded-[10px] border border-[var(--octo-border-card)] px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                          {t("floorPlan.versions.version").replace("{n}", String(v.version))}
                        </span>
                        {v.label && <span className="truncate text-[12.5px] text-[var(--octo-text-secondary)]">{v.label}</span>}
                        {v.isLive && (
                          <span className="rounded-full bg-[var(--octo-tone-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--octo-tone-success-text)]">
                            {t("floorPlan.versions.live")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--octo-text-muted)]">
                        {formatDateTime(Date.parse(v.publishedAtUtc), locale)}
                        {v.publishedBy ? ` · ${v.publishedBy}` : ""}
                        {` · ${t("floorPlan.summary.totalTables")} ${v.spotCount}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => toggle(v.version)} aria-expanded={isOpen} className={action}>
                        <Eye size={13} />
                        {isOpen ? at("versions.hide") : at("versions.view")}
                        <ChevronDown size={13} className={clsx("transition-transform", isOpen && "rotate-180")} />
                      </button>
                      {!v.isLive && (
                        <>
                          <button type="button" onClick={() => void restore(v.version)} disabled={busy !== null} className={action}>
                            <RotateCcw size={13} />
                            {busy === v.version && !rollback ? t("floorPlan.versions.restoring") : t("floorPlan.versions.restoreToDraft")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRollback({ version: v.version, notes: "" })}
                            disabled={busy !== null}
                            className={clsx(action, "border-[#0D6EFD]/40 text-[#0D6EFD]")}
                          >
                            <Rocket size={13} />
                            {at("versions.makeLive")}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {rollback?.version === v.version && (
                    <div className="mt-3 rounded-[10px] bg-[var(--octo-soft-bg)] p-3">
                      <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{at("versions.rollbackTitle", { n: v.version })}</p>
                      <p className="mt-1 text-[12.5px] text-[var(--octo-text-secondary)]">{at("versions.rollbackBody")}</p>
                      <TextAreaField
                        className="mt-3"
                        label={at("versions.rollbackNotes")}
                        value={rollback.notes}
                        maxLength={500}
                        onChange={(notes) => setRollback({ ...rollback, notes })}
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => setRollback(null)} disabled={busy !== null} className={action}>
                          {at("common.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void makeLive()}
                          disabled={busy !== null}
                          className="flex items-center gap-1.5 rounded-[8px] bg-[#0D6EFD] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          <Rocket size={13} />
                          {busy === v.version ? at("common.saving") : at("versions.makeLive")}
                        </button>
                      </div>
                    </div>
                  )}

                  {isOpen && (
                    <div className="mt-3 border-t border-[var(--octo-border-card)] pt-3">
                      {!detail || detail.state === "loading" ? (
                        <p className="text-[12.5px] text-[var(--octo-text-muted)]">{at("common.loading")}</p>
                      ) : detail.state === "error" ? (
                        <p className="text-[12.5px] text-error">{detail.message}</p>
                      ) : (
                        <VersionDetail doc={detail.doc} />
                      )}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </Modal>
  );
}

function VersionDetail({ doc }: { doc: FloorPlanVersionDocumentResponse }) {
  const { locale } = useI18n();
  const at = useAdminText();
  const { layout, version } = doc;
  const seats = layout.spots.reduce((sum, s) => sum + s.capacity, 0);
  const perZone = new Map<string | null, number>();
  for (const s of layout.spots) perZone.set(s.zoneId, (perZone.get(s.zoneId) ?? 0) + 1);
  return (
    <div className="flex flex-col gap-3 text-[12.5px]">
      <dl className="grid grid-cols-3 gap-2">
        {[
          [at("versions.tables"), formatNumber(layout.spots.length, locale)],
          [at("versions.capacity"), formatNumber(seats, locale)],
          [at("versions.zones"), formatNumber(layout.zones.length, locale)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-[var(--octo-soft-bg)] px-3 py-2">
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</dt>
            <dd className="text-[15px] font-bold text-[var(--octo-text-primary)]">{value}</dd>
          </div>
        ))}
      </dl>
      {layout.zones.length === 0 ? (
        <p className="text-[var(--octo-text-muted)]">{at("versions.noZones")}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {[...layout.zones]
            .sort((a, b) => a.position - b.position)
            .map((z) => (
              <li key={z.id} className="flex items-center gap-1.5 rounded-full bg-[var(--octo-soft-bg)] px-2.5 py-1 text-[var(--octo-text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: z.color ?? "#8B8B93" }} />
                {z.name} · {formatNumber(perZone.get(z.id) ?? 0, locale)}
              </li>
            ))}
        </ul>
      )}
      <p className="text-[var(--octo-text-secondary)]" dir="auto">
        {layout.spots
          .map((s) => s.code)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          .join(" · ")}
      </p>
      {version.notes && (
        <p className="text-[var(--octo-text-secondary)]">
          <span className="font-semibold text-[var(--octo-text-primary)]">{at("versions.notes")}: </span>
          {version.notes}
        </p>
      )}
    </div>
  );
}
