// One published version, read from GET /menus/{id}/versions/{v}: its header,
// and the sections and items it froze, read defensively from the publication
// document (a JSON object whose schema is versioned server-side — anything
// this view doesn't recognise is still in the downloadable JSON).
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@ui/primitives";
import type { MenuVersionResponse } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../copy";

type Localized = Record<string, string> | undefined;
interface DocSection {
  kind?: string;
  name?: Localized;
  placements?: { kind?: string; id?: string }[];
}
interface DocItem {
  name?: Localized;
  basePrice?: { amount: number; currency: string } | null;
}
interface DocOffer {
  name?: Localized;
}
interface PublicationDoc {
  sections?: DocSection[];
  items?: Record<string, DocItem>;
  offers?: Record<string, DocOffer>;
}

function asDoc(value: unknown): PublicationDoc {
  return value && typeof value === "object" ? (value as PublicationDoc) : {};
}

export function VersionDetail({
  version,
  menuName,
  onBack,
}: {
  version: MenuVersionResponse;
  menuName: string;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  const c = useMenuCopy();
  const doc = asDoc(version.document);
  const pick = (n: Localized) => (n ? n[locale] || n.en || n.ar || Object.values(n)[0] || "" : "");

  function download() {
    const blob = new Blob([JSON.stringify(version.document, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${menuName.replace(/[^\w-]+/g, "-") || "menu"}-v${version.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--octo-accent)] hover:underline"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" aria-hidden />
          {c("versions.back")}
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
        >
          <Download size={13} aria-hidden />
          {c("versions.download")}
        </button>
      </div>

      <div className="mt-3 rounded-[10px] border border-[var(--octo-border-card)] px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuVersions.version").replace("{n}", String(version.version))}
          </span>
          {version.isCurrent && <Badge tone="success">{t("menuVersions.current")}</Badge>}
          <span className="text-[11.5px] text-[var(--octo-text-muted)]">{c("versions.schema", { n: version.schemaVersion })}</span>
        </div>
        <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
          {new Date(version.publishedAtUtc).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
          {version.publishedBy ? ` · ${version.publishedBy}` : ""}
        </p>
        <p className="mt-1 truncate text-[11.5px] text-[var(--octo-text-faint)]" dir="ltr">
          {c("versions.hash")}: {version.contentHash}
        </p>
      </div>

      <h3 className="mt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-muted)]">{c("versions.sections")}</h3>
      <div className="mt-2 max-h-[38vh] space-y-2 overflow-y-auto">
        {(doc.sections ?? []).length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-[var(--octo-text-muted)]">{c("empty")}</p>
        ) : (
          (doc.sections ?? []).map((s, i) => (
            <div key={i} className="rounded-[10px] bg-[var(--octo-hover)] px-3 py-2.5">
              <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{pick(s.name) || "—"}</p>
              <ul className="mt-1 space-y-0.5">
                {(s.placements ?? []).map((p, j) => {
                  const isOffer = (p.kind ?? "").toLowerCase() === "offer";
                  const entry = p.id ? (isOffer ? doc.offers?.[p.id] : doc.items?.[p.id]) : undefined;
                  const price = !isOffer ? (entry as DocItem | undefined)?.basePrice : null;
                  return (
                    <li key={j} className="flex items-center justify-between gap-3 text-[12px] text-[var(--octo-text-secondary)]">
                      <span className="truncate">{pick(entry?.name) || p.id}</span>
                      {price && (
                        <span className="shrink-0 whitespace-nowrap">
                          {price.currency} {price.amount}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
