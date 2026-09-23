// Version history for one menu: BACKEND_GAPS.md 2.4 (Menu versions) — the
// endpoints (list/get/republish) were ready and wired nowhere. Rollback here
// means republishing an older version as the current live one; the API has
// no separate "restore to draft" for menus the way Floor Plan's does.
import { useEffect, useState } from "react";
import { Eye, History, RotateCcw } from "lucide-react";
import { Badge, Modal } from "@ui/primitives";
import {
  ApiError,
  listMenuVersions,
  republishVersion,
  type MenuVersionResponse,
  type MenuVersionSummaryResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { describeApiError, readMenuVersion, type Menu } from "@/entities/menu";
import { VersionDetail } from "./version-detail";
import { useMenuCopy } from "../copy";

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function VersionsModal({
  menu,
  onClose,
  onRepublished,
}: {
  menu: Menu | null;
  onClose: () => void;
  onRepublished: () => void;
}) {
  const { t, locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [versions, setVersions] = useState<MenuVersionSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyVersion, setBusyVersion] = useState<number | null>(null);
  const [viewing, setViewing] = useState<MenuVersionResponse | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const c = useMenuCopy();

  useEffect(() => {
    setViewing(null);
    if (!menu || !activeBusinessId) {
      setVersions(null);
      return;
    }
    let cancelled = false;
    setError(null);
    listMenuVersions(activeBusinessId, menu.id, 1, 50)
      .then((res) => {
        if (!cancelled) setVersions(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? (err.problem?.detail ?? err.problem?.errorCode ?? err.message) : "Failed to load versions");
      });
    return () => {
      cancelled = true;
    };
  }, [menu, activeBusinessId]);

  if (!menu) return null;

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  }

  async function view(version: number) {
    if (!activeBusinessId || !menu) return;
    setOpening(version);
    setError(null);
    try {
      setViewing(await readMenuVersion(activeBusinessId, menu.id, version));
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setOpening(null);
    }
  }

  async function republish(version: number) {
    if (!activeBusinessId || !menu) return;
    setBusyVersion(version);
    setError(null);
    try {
      await republishVersion(activeBusinessId, menu.id, version, { businessId: activeBusinessId, menuId: menu.id, version }, key());
      const fresh = await listMenuVersions(activeBusinessId, menu.id, 1, 50);
      setVersions(fresh.data);
      onRepublished();
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem?.detail ?? err.problem?.errorCode ?? err.message) : "Republish failed");
    } finally {
      setBusyVersion(null);
    }
  }

  return (
    <Modal open onClose={onClose} className="max-w-[560px]">
      <div className="flex items-center gap-2.5">
        <History size={20} className="text-[var(--octo-text-secondary)]" />
        <h2 className="text-[18px] font-semibold text-[var(--octo-text-primary)]">{t("menuVersions.title")}</h2>
      </div>
      <p className="mt-1 text-[13.5px] text-[var(--octo-text-secondary)]">{menu.name}</p>

      {error && (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}

      {viewing ? (
        <VersionDetail version={viewing} menuName={menu.name} onBack={() => setViewing(null)} />
      ) : (
      <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
        {versions === null ? (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("common.loading")}</p>
        ) : versions.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("menuVersions.empty")}</p>
        ) : (
          versions
            .slice()
            .sort((a, b) => b.version - a.version)
            .map((v) => (
              <div
                key={v.version}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--octo-border-card)] px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                      {t("menuVersions.version").replace("{n}", String(v.version))}
                    </span>
                    {v.isCurrent && <Badge tone="success">{t("menuVersions.current")}</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--octo-text-muted)]">
                    {formatDate(v.publishedAtUtc)}
                    {v.publishedBy ? ` · ${v.publishedBy}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void view(v.version)}
                  disabled={opening !== null}
                  className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eye size={13} />
                  {opening === v.version ? c("loading") : c("versions.view")}
                </button>
                {!v.isCurrent && (
                  <button
                    type="button"
                    onClick={() => void republish(v.version)}
                    disabled={busyVersion !== null}
                    className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    {busyVersion === v.version ? t("menuVersions.republishing") : t("menuVersions.republish")}
                  </button>
                )}
                </div>
              </div>
            ))
        )}
      </div>
      )}
    </Modal>
  );
}
