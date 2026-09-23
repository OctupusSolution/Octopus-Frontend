// Publish history for the public site: BACKEND_GAPS 1b.11. Each version can be
// viewed in full (`GET /versions/{v}`), restored as the draft (the merchant
// reviews it in the builder first — same posture as Floor Plan's history), or
// rolled back to (`POST /versions/{v}/rollback`), which makes it live again
// straight away as a new version and so asks for confirmation first.
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, History, RotateCcw, Undo2, X } from "lucide-react";
import { ApiError, type PublicSitePublicationResponse, type VersionSummaryResponse } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

// Strings not yet in packages/i18n (not owned by this slice); `t` wins once they land.
const FALLBACK: Record<"en" | "ar", Record<string, string>> = {
  en: {
    "publicLink.versions.view": "Details",
    "publicLink.versions.hide": "Hide",
    "publicLink.versions.detailsLoading": "Loading version…",
    "publicLink.versions.detailsFailed": "Couldn't load this version.",
    "publicLink.versions.rollback": "Make live",
    "publicLink.versions.rollingBack": "Publishing…",
    "publicLink.versions.rollbackConfirm":
      "Make version {n} live now? Visitors will see it immediately. It is published as a new version; your draft is not changed.",
    "publicLink.versions.rollbackConfirmAction": "Yes, make it live",
    "publicLink.versions.cancel": "Cancel",
    "publicLink.versions.rolledBack": "Version {n} is live again.",
    "publicLink.versions.rollbackFailed": "Couldn't make that version live.",
    "publicLink.versions.alreadyLive": "That version is already live.",
    "publicLink.versions.stale": "The site changed since you opened it. Reload and try again.",
    "publicLink.versions.copiedFrom": "Copied from version {n}",
    "publicLink.versions.displayName": "Name",
    "publicLink.versions.colors": "Colours",
    "publicLink.versions.fonts": "Fonts",
    "publicLink.versions.sections": "Sections",
    "publicLink.versions.noSections": "No sections",
    "publicLink.versions.hidden": "hidden",
  },
  ar: {
    "publicLink.versions.view": "التفاصيل",
    "publicLink.versions.hide": "إخفاء",
    "publicLink.versions.detailsLoading": "جارٍ تحميل النسخة…",
    "publicLink.versions.detailsFailed": "تعذّر تحميل هذه النسخة.",
    "publicLink.versions.rollback": "اجعلها منشورة",
    "publicLink.versions.rollingBack": "جارٍ النشر…",
    "publicLink.versions.rollbackConfirm":
      "نشر النسخة {n} الآن؟ سيراها الزوار فورًا. تُنشر كنسخة جديدة ولن تتغير مسودتك.",
    "publicLink.versions.rollbackConfirmAction": "نعم، انشرها",
    "publicLink.versions.cancel": "إلغاء",
    "publicLink.versions.rolledBack": "النسخة {n} منشورة من جديد.",
    "publicLink.versions.rollbackFailed": "تعذّر نشر هذه النسخة.",
    "publicLink.versions.alreadyLive": "هذه النسخة منشورة بالفعل.",
    "publicLink.versions.stale": "تغيّر الموقع منذ فتحه. أعد التحميل وحاول مرة أخرى.",
    "publicLink.versions.copiedFrom": "منسوخة من النسخة {n}",
    "publicLink.versions.displayName": "الاسم",
    "publicLink.versions.colors": "الألوان",
    "publicLink.versions.fonts": "الخطوط",
    "publicLink.versions.sections": "الأقسام",
    "publicLink.versions.noSections": "لا توجد أقسام",
    "publicLink.versions.hidden": "مخفي",
  },
};

function rollbackError(err: unknown, tx: (key: string) => string): string {
  if (err instanceof ApiError) {
    const code = err.problem?.errorCode;
    if (code === "publiclink.version.same-as-current") return tx("publicLink.versions.alreadyLive");
    if (code === "publiclink.concurrency.stale") return tx("publicLink.versions.stale");
    if (err.problem?.detail) return err.problem.detail;
  }
  return tx("publicLink.versions.rollbackFailed");
}

type Details = { status: "loading" } | { status: "error" } | { status: "ready"; data: PublicSitePublicationResponse };

function VersionDetails({ details, tx }: { details: Details; tx: (key: string) => string }) {
  if (details.status === "loading") {
    return <p className="py-2 text-[12px] text-[var(--octo-text-muted)]">{tx("publicLink.versions.detailsLoading")}</p>;
  }
  if (details.status === "error") {
    return <p className="py-2 text-[12px] text-error">{tx("publicLink.versions.detailsFailed")}</p>;
  }
  const { brand, sections, sourceVersion, label } = details.data;
  const fonts = [brand.typography.titleEnglish, brand.typography.bodyEnglish, brand.typography.titleArabic, brand.typography.bodyArabic]
    .filter((f): f is string => Boolean(f))
    .filter((f, i, all) => all.indexOf(f) === i);
  const row = "grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-[12px]";
  const key = "text-[var(--octo-text-muted)]";
  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-[var(--octo-divider)] pt-2">
      {(label || sourceVersion !== null) && (
        <p className="text-[12px] text-[var(--octo-text-secondary)]">
          {label ?? tx("publicLink.versions.copiedFrom").replace("{n}", String(sourceVersion))}
        </p>
      )}
      <div className={row}>
        <span className={key}>{tx("publicLink.versions.displayName")}</span>
        <span className="truncate text-[var(--octo-text-primary)]">{brand.displayName ?? "—"}</span>
      </div>
      <div className={row}>
        <span className={key}>{tx("publicLink.versions.colors")}</span>
        <span className="flex flex-wrap gap-1">
          {Object.entries(brand.colors).length === 0
            ? "—"
            : Object.entries(brand.colors).map(([token, value]) => (
                <span
                  key={token}
                  title={`${token}: ${value}`}
                  className="h-4 w-4 rounded-[4px] border border-[var(--octo-border-card)]"
                  style={{ background: value }}
                />
              ))}
        </span>
      </div>
      <div className={row}>
        <span className={key}>{tx("publicLink.versions.fonts")}</span>
        <span className="truncate text-[var(--octo-text-primary)]" dir="ltr">
          {fonts.length ? fonts.join(", ") : "—"}
        </span>
      </div>
      <div className={row}>
        <span className={key}>{tx("publicLink.versions.sections")}</span>
        <span className="flex flex-wrap gap-1">
          {sections.length === 0
            ? tx("publicLink.versions.noSections")
            : sections.map((s) => (
                <span
                  key={s.sectionId}
                  className="rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[11px] text-[var(--octo-text-secondary)]"
                >
                  {s.type}
                  {!s.enabled && ` · ${tx("publicLink.versions.hidden")}`}
                </span>
              ))}
        </span>
      </div>
    </div>
  );
}

export function PublicLinkVersionsModal({
  open,
  onClose,
  listVersions,
  getVersion,
  onRestore,
  onRollback,
}: {
  open: boolean;
  onClose: () => void;
  listVersions: () => Promise<VersionSummaryResponse[]>;
  getVersion: (version: number) => Promise<PublicSitePublicationResponse>;
  onRestore: (version: number) => Promise<void>;
  onRollback: (version: number) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const tx = (k: string) => {
    const value = t(k);
    return value === k ? FALLBACK[locale === "ar" ? "ar" : "en"][k] ?? k : value;
  };
  const [versions, setVersions] = useState<VersionSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ version: number; action: "restore" | "rollback" } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, Details>>({});
  const [confirming, setConfirming] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) {
      setVersions(null);
      setError(null);
      setNotice(null);
      setExpanded(null);
      setDetails({});
      setConfirming(null);
      return;
    }
    let cancelled = false;
    listVersions()
      .then((rows) => {
        if (!cancelled) setVersions(rows);
      })
      .catch(() => {
        if (!cancelled) setError(t("publicLink.versions.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [open, listVersions, t, reloadKey]);

  function toggleDetails(version: number) {
    if (expanded === version) {
      setExpanded(null);
      return;
    }
    setExpanded(version);
    const current = details[version];
    if (current && current.status !== "error") return;
    setDetails((d) => ({ ...d, [version]: { status: "loading" } }));
    getVersion(version).then(
      (data) => setDetails((d) => ({ ...d, [version]: { status: "ready", data } })),
      () => setDetails((d) => ({ ...d, [version]: { status: "error" } }))
    );
  }

  async function restore(version: number) {
    setBusy({ version, action: "restore" });
    setError(null);
    setNotice(null);
    try {
      await onRestore(version);
      setNotice(t("publicLink.versions.restored"));
    } catch {
      setError(t("publicLink.versions.restoreFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function rollback(version: number) {
    setConfirming(null);
    setBusy({ version, action: "rollback" });
    setError(null);
    setNotice(null);
    try {
      await onRollback(version);
      setNotice(tx("publicLink.versions.rolledBack").replace("{n}", String(version)));
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(rollbackError(err, tx));
    } finally {
      setBusy(null);
    }
  }

  const secondaryBtn =
    "flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Modal open={open} onClose={onClose} className="max-w-[600px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <History size={20} className="text-[var(--octo-text-secondary)]" />
          <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.versions.title")}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("publicLink.versions.close")}
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
      {notice !== null && !error && (
        <p role="status" className="mt-3 rounded-[9px] bg-[var(--octo-tone-success-bg)] px-3 py-2 text-[12.5px] text-[var(--octo-tone-success-text)]">
          {notice}
        </p>
      )}

      <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
        {versions === null ? (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">
            {error ? "" : t("publicLink.versions.loading")}
          </p>
        ) : versions.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("publicLink.versions.empty")}</p>
        ) : (
          versions
            .slice()
            .sort((a, b) => b.version - a.version)
            .map((v) => (
              <div key={v.version} className="rounded-[10px] border border-[var(--octo-border-card)] px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                        {t("publicLink.versions.version").replace("{n}", String(v.version))}
                      </span>
                      {v.isLive && (
                        <span className="rounded-full bg-[var(--octo-tone-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--octo-tone-success-text)]">
                          {t("publicLink.versions.live")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--octo-text-muted)]">
                      {new Date(v.publishedAtUtc).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      {v.publishedBy ? ` · ${v.publishedBy}` : ""}
                      {v.label ? ` · ${v.label}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleDetails(v.version)}
                      aria-expanded={expanded === v.version}
                      className={secondaryBtn}
                    >
                      {expanded === v.version ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {expanded === v.version ? tx("publicLink.versions.hide") : tx("publicLink.versions.view")}
                    </button>
                    {!v.isLive && (
                      <>
                        <button
                          type="button"
                          onClick={() => void restore(v.version)}
                          disabled={busy !== null}
                          className={secondaryBtn}
                        >
                          <RotateCcw size={13} />
                          {busy?.version === v.version && busy.action === "restore" ? t("publicLink.versions.restoring") : t("publicLink.versions.restoreToDraft")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(v.version)}
                          disabled={busy !== null}
                          className={secondaryBtn}
                        >
                          <Undo2 size={13} className="rtl:-scale-x-100" />
                          {busy?.version === v.version && busy.action === "rollback"
                            ? tx("publicLink.versions.rollingBack")
                            : tx("publicLink.versions.rollback")}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {confirming === v.version && (
                  <div role="alertdialog" className="mt-2 rounded-[9px] border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-2.5">
                    <p className="text-[12.5px] text-[var(--octo-text-primary)]">
                      {tx("publicLink.versions.rollbackConfirm").replace("{n}", String(v.version))}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void rollback(v.version)}
                        className="rounded-[8px] bg-[#0D6EFD] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#0D6EFD]/90"
                      >
                        {tx("publicLink.versions.rollbackConfirmAction")}
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className={secondaryBtn}>
                        {tx("publicLink.versions.cancel")}
                      </button>
                    </div>
                  </div>
                )}
                {expanded === v.version && details[v.version] && <VersionDetails details={details[v.version]} tx={tx} />}
              </div>
            ))
        )}
      </div>
    </Modal>
  );
}
