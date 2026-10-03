// The menu's real QR code, under the Theme step's preview: its active direct
// access code (GET /access-codes), printed as `printableUrl`
// (Menu:PublicCodesBaseUri/c/{key}). A menu without one gets a Create button
// (POST /access-codes, kind MenuDirect). The two large buttons the frame draws
// beneath it open that address and a table tent for it.
//
// The code is drawn from the Public Link Builder's own encoder rather than a
// new dependency — one QR implementation in the app. Its symbol holds 78
// bytes; a printable URL is the base (e.g. "https://menu.octopus.sa", 23) +
// "/c/" + a 26-character key, and a table's "?l=Table%20NN" adds 13.
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2, QrCode as QrIcon } from "lucide-react";
import { createAccessCode, listAccessCodes, type AccessCodeResponse } from "@octopus/api-client";
import { Modal, Select } from "@ui/primitives";
import { QrCode } from "@/pages/public-link/ui/qr-code";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { isServerId } from "@/entities/menu";

const TABLES = Array.from({ length: 30 }, (_, i) => i + 1);

const ACCENT_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-[9px] border border-[var(--octo-accent)] bg-[var(--octo-card)] font-semibold text-[var(--octo-accent)] transition-colors hover:bg-[var(--octo-selected)]";

const newKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** The printed address with the table's location label, as the server's own
 *  label parameter (`?l=`, escaped) — what its QR image endpoint encodes. */
function tableQrUrl(printableUrl: string, table: number): string {
  return `${printableUrl}?l=${encodeURIComponent(`Table ${table}`)}`;
}

/** Rasterises the QR <svg> inside `container` to a PNG and downloads it.
 *  Drawn onto a canvas rather than saved as SVG because the frame promises a
 *  QR "code" a merchant prints or drops into a design tool, where PNG is the
 *  format that works everywhere. */
function downloadQrPng(container: HTMLElement | null, filename: string, size = 1024): void {
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const markup = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Crisp modules: a QR scaled with smoothing blurs its edges.
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export function QrPanel({ menuId }: { menuId: string }) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const menuQr = useRef<HTMLDivElement>(null);
  const tableQr = useRef<HTMLDivElement>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [table, setTable] = useState(1);
  const [code, setCode] = useState<AccessCodeResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "creating" | "error" | "unavailable" | "unsaved">("loading");
  const [copied, setCopied] = useState(false);
  // Bumped by every request and by the effect's cleanup: a response whose
  // number is no longer current belongs to an earlier menu id (the local id a
  // first save replaces with the server's) or to an unmounted panel, and is dropped.
  const request = useRef(0);
  // A menu only on this device (not saved yet) has no server id to hang a code on.
  const saved = isServerId(menuId);

  const load = useCallback(async () => {
    const mine = ++request.current;
    setCode(null);
    if (!activeBusinessId) return setState("unavailable");
    if (!saved) return setState("unsaved");
    setState("loading");
    try {
      // Filtered on the server: the list is paged and business-wide, so an
      // unfiltered first page can miss this menu's code. Status and kind are
      // still checked here, case-insensitively, as the library's modal does.
      const list = (await listAccessCodes(activeBusinessId, { menuId, kind: "MenuDirect" })).data ?? [];
      if (mine !== request.current) return;
      setCode(
        list.find(
          (c) => c.menuId === menuId && c.kind.toLowerCase() === "menudirect" && c.status.toLowerCase() === "active"
        ) ?? null
      );
      setState("ready");
    } catch {
      if (mine === request.current) setState("error");
    }
  }, [activeBusinessId, menuId, saved]);
  useEffect(() => {
    void load();
    return () => {
      request.current++;
    };
  }, [load]);

  async function create() {
    if (!activeBusinessId || !saved) return;
    const mine = ++request.current;
    setState("creating");
    try {
      const created = await createAccessCode(
        activeBusinessId,
        { businessId: activeBusinessId, kind: "MenuDirect", branchId: null, menuId },
        newKey()
      );
      if (mine !== request.current) return;
      setCode(created);
      setState("ready");
    } catch {
      if (mine === request.current) setState("error");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard refused (permissions, insecure context): the URL is on screen to select.
    }
  }

  const url = code?.printableUrl ?? null;

  return (
    <>
      <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 text-center">
        <p className="text-[17px] font-medium text-[var(--octo-text-primary)]">{t("menuTheme.scanTitle")}</p>

        {url ? (
          <>
            {/* White ground in both themes: an inverted code does not scan. */}
            <div ref={menuQr} className="mx-auto mt-3 w-fit rounded-[10px] bg-white p-1">
              <QrCode value={url} size={168} />
            </div>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[11.5px] text-[var(--octo-text-muted)] hover:underline"
                dir="ltr"
              >
                {url}
              </a>
              <button
                type="button"
                onClick={() => void copy(url)}
                aria-label={t("menuTheme.qr.copy")}
                title={t("menuTheme.qr.copy")}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
              >
                {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => downloadQrPng(menuQr.current, "menu-qr.png")}
              className={`${ACCENT_OUTLINE} mx-auto mt-3 w-full max-w-[280px] px-4 py-2 text-[14px]`}
            >
              <Download size={16} aria-hidden />
              {t("menuTheme.downloadQr")}
            </button>
          </>
        ) : state === "unsaved" ? (
          <p className="mt-3 text-[13.5px] text-[var(--octo-text-secondary)]">{t("menuTheme.qr.saveFirst")}</p>
        ) : state === "unavailable" ? (
          <p className="mt-3 text-[13.5px] text-[var(--octo-text-secondary)]">{t("menuTheme.qr.error")}</p>
        ) : state === "error" ? (
          <>
            <p className="mt-3 text-[13.5px] text-[var(--octo-text-secondary)]">{t("menuTheme.qr.error")}</p>
            <button
              type="button"
              onClick={() => void load()}
              className={`${ACCENT_OUTLINE} mx-auto mt-3 w-full max-w-[280px] px-4 py-2 text-[14px]`}
            >
              {t("menuTheme.qr.retry")}
            </button>
          </>
        ) : state === "ready" ? (
          <>
            <p className="mt-3 text-[13.5px] text-[var(--octo-text-secondary)]">{t("menuTheme.qr.none")}</p>
            <button
              type="button"
              onClick={() => void create()}
              className={`${ACCENT_OUTLINE} mx-auto mt-3 w-full max-w-[280px] px-4 py-2 text-[14px]`}
            >
              <QrIcon size={16} aria-hidden />
              {t("menuTheme.qr.create")}
            </button>
          </>
        ) : (
          <p className="mt-3 inline-flex items-center gap-2 text-[13.5px] text-[var(--octo-text-muted)]">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            {t("common.loading")}
          </p>
        )}
      </section>

      {url && (
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[16px] font-semibold text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
          >
            <ExternalLink size={19} aria-hidden />
            {t("menuTheme.publicPreview")}
          </a>
          <button
            type="button"
            onClick={() => setTableOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-track)] px-3 text-[16px] font-semibold text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
          >
            <QrIcon size={19} aria-hidden />
            {t("menuTheme.tableQrPreview")}
          </button>
        </div>
      )}

      <Modal
        open={tableOpen && url !== null}
        onClose={() => setTableOpen(false)}
        title={t("menuTheme.tableQrPreview")}
        className="max-w-sm"
      >
        <label className="block">
          <span className="text-[13px] font-medium text-[var(--octo-text-secondary)]">{t("menuTheme.tableNumber")}</span>
          <Select className="mt-1.5" value={String(table)} onChange={(e) => setTable(Number(e.target.value))}>
            {TABLES.map((n) => (
              <option key={n} value={n}>
                {t("menuTheme.table")} {n}
              </option>
            ))}
          </Select>
        </label>

        {/* A table tent: what the diner actually sees on the table. */}
        <div className="mt-4 rounded-[12px] border border-[var(--octo-border-card)] p-4 text-center">
          <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("menuTheme.scanTitle")}</p>
          <div ref={tableQr} className="mx-auto mt-2 w-fit rounded-[8px] bg-white p-1">
            {url && <QrCode value={tableQrUrl(url, table)} size={176} />}
          </div>
          <p className="mt-2 text-[20px] font-bold text-[var(--octo-text-primary)]">
            {t("menuTheme.table")} {table}
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => downloadQrPng(tableQr.current, `table-${table}-qr.png`)}
            className={`${ACCENT_OUTLINE} flex-1 px-3 py-2 text-[13.5px]`}
          >
            <Download size={15} aria-hidden />
            {t("menuTheme.downloadQr")}
          </button>
          <button
            type="button"
            onClick={() => setTableOpen(false)}
            className="rounded-[9px] border border-[var(--octo-border-input)] px-4 py-2 text-[13.5px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
          >
            {t("menuTheme.close")}
          </button>
        </div>
      </Modal>
    </>
  );
}
