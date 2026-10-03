// The menu's real QR code, under the Theme step's preview — the frame's
// "Scan to see our menu" card: its active direct access code
// (GET /access-codes), printed as `printableUrl`
// (Menu:PublicCodesBaseUri/c/{key}). A menu without one gets a Create button
// (POST /access-codes, kind MenuDirect).
//
// The code is drawn from the Public Link Builder's own encoder rather than a
// new dependency — one QR implementation in the app. Its symbol holds 78
// bytes; a printable URL is the base (e.g. "https://menu.octopus.sa", 23) +
// "/c/" + a 26-character key, and a table's "?l=Table%20NN" adds 13.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { createAccessCode, listAccessCodes, type AccessCodeResponse } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { QrCode } from "@/pages/public-link/ui/qr-code";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { isServerId } from "@/entities/menu";
import { SelectBox } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { LINE, SURFACE_SUBTLE, TEXT, TEXT_GRAY } from "../../_shared/theme";

/** The frame's card is a title, the code and one button. The printed address
 *  with its copy button, and the "Public Link Preview" / "Table QR Preview"
 *  pair (a hidden layer in the frame), are kept but not drawn. */
const SHOW_QR_LINK: boolean = false;
const SHOW_QR_ACTIONS: boolean = false;

const TABLES = Array.from({ length: 30 }, (_, i) => i + 1);

/** The card's one button: 242×36, accent outline, 12px bold. */
const CARD_BUTTON =
  "inline-flex h-9 w-full max-w-[242px] items-center justify-center gap-2 rounded-[8px] border border-[#0D6EFD] px-3 text-[12px] font-bold leading-3 text-[#0D6EFD] hover:bg-[#f5f9ff] disabled:cursor-not-allowed disabled:opacity-60 [[data-theme=dark]_&]:hover:bg-[#0d6efd]/15";
const NOTE = `text-center text-[12px] font-medium leading-[1.4] ${TEXT_GRAY}`;

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

function CardShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col items-center gap-4 overflow-hidden rounded-[28px] bg-[var(--octo-card)] p-4 shadow-[0px_0px_8px_0px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border [[data-theme=dark]_&]:border-[var(--octo-border-card)]">
      <p className={clsx("text-center text-[16px] font-medium leading-4", TEXT)}>{t("menuTheme.scanTitle")}</p>
      {children}
    </section>
  );
}

/** The frame's card for a menu that has its code: title, code, download. */
export function MenuQrCard({ url }: { url: string }) {
  const { t } = useI18n();
  const menuQr = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard refused (permissions, insecure context): the URL is on screen to select.
    }
  }

  return (
    <CardShell>
      {/* White ground in both themes: an inverted code does not scan. */}
      <div ref={menuQr} className="grid h-[179px] w-[160px] place-items-center bg-white">
        <QrCode value={url} size={160} />
      </div>
      {SHOW_QR_LINK && (
        <div className="flex items-center justify-center gap-1">
          <a href={url} target="_blank" rel="noopener noreferrer" className={clsx("break-all text-[12px] hover:underline", TEXT_GRAY)} dir="ltr">
            {url}
          </a>
          <button
            type="button"
            onClick={() => void copy()}
            aria-label={t("menuTheme.qr.copy")}
            title={t("menuTheme.qr.copy")}
            className={clsx("grid size-6 shrink-0 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT_GRAY)}
          >
            <MenuIcon name={copied ? "menu-done-circle.svg" : "menu-copy.svg"} size={16} />
          </button>
        </div>
      )}
      <button type="button" onClick={() => downloadQrPng(menuQr.current, "menu-qr.png")} className={CARD_BUTTON}>
        <span className="grid size-6 place-items-center">
          <MenuIcon name="menu-download.svg" size={21.5} />
        </span>
        {t("menuTheme.downloadQr")}
      </button>
    </CardShell>
  );
}

export function QrPanel({ menuId }: { menuId: string }) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const tableQr = useRef<HTMLDivElement>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [table, setTable] = useState(1);
  const [code, setCode] = useState<AccessCodeResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "creating" | "error" | "unavailable" | "unsaved">("loading");
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

  const url = code?.printableUrl ?? null;

  return (
    <>
      {url ? (
        <MenuQrCard url={url} />
      ) : (
        <CardShell>
          {state === "unsaved" ? (
          <p className={NOTE}>{t("menuTheme.qr.saveFirst")}</p>
        ) : state === "unavailable" ? (
          <p className={NOTE}>{t("menuTheme.qr.error")}</p>
        ) : state === "error" ? (
          <>
            <p role="alert" className={NOTE}>
              {t("menuTheme.qr.error")}
            </p>
            <button type="button" onClick={() => void load()} className={CARD_BUTTON}>
              {t("menuTheme.qr.retry")}
            </button>
          </>
        ) : state === "ready" ? (
          <>
            <p className={NOTE}>{t("menuTheme.qr.none")}</p>
            <button type="button" onClick={() => void create()} className={CARD_BUTTON}>
              <MenuIcon name="menu-qr-code.svg" size={24} />
              {t("menuTheme.qr.create")}
            </button>
          </>
        ) : (
          <p className={clsx("inline-flex items-center gap-2", NOTE)}>
            <MenuIcon name="menu-loading.svg" size={16} className="animate-spin" />
            {t(state === "creating" ? "menuTheme.qr.creating" : "common.loading")}
          </p>
        )}
        </CardShell>
      )}

      {SHOW_QR_ACTIONS && url && (
        <div className="grid gap-6 sm:grid-cols-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx("inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border px-3 text-[18px] font-bold leading-[18px] hover:bg-[var(--octo-hover)]", LINE, TEXT)}
          >
            <MenuIcon name="menu-link-external.svg" size={24} />
            {t("menuTheme.publicPreview")}
          </a>
          <button
            type="button"
            onClick={() => setTableOpen(true)}
            className={clsx("inline-flex h-12 items-center justify-center gap-2 rounded-[8px] px-3 text-[18px] font-bold leading-[18px] hover:brightness-95", SURFACE_SUBTLE, TEXT)}
          >
            <MenuIcon name="menu-qr-code.svg" size={24} />
            {t("menuTheme.tableQrPreview")}
          </button>
        </div>
      )}

      <Modal
        open={SHOW_QR_ACTIONS && tableOpen && url !== null}
        onClose={() => setTableOpen(false)}
        backdropClassName="bg-black/60"
        className="!max-w-[420px] !rounded-[12px] !p-6 !shadow-none"
      >
        <div className="flex flex-col gap-6">
          <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
            {t("menuTheme.tableQrPreview")}
          </h2>
          <label className="flex flex-col gap-3">
            <span className={clsx("px-2 text-[16px] font-medium leading-4", TEXT)}>{t("menuTheme.tableNumber")}</span>
            <SelectBox value={String(table)} ariaLabel={t("menuTheme.tableNumber")} onChange={(value) => setTable(Number(value))}>
              {TABLES.map((n) => (
                <option key={n} value={n}>
                  {t("menuTheme.table")} {n}
                </option>
              ))}
            </SelectBox>
          </label>

          {/* A table tent: what the diner actually sees on the table. */}
          <div className={clsx("flex flex-col items-center gap-4 rounded-[12px] border p-4", LINE)}>
            <p className={clsx("text-[16px] font-medium leading-4", TEXT)}>{t("menuTheme.scanTitle")}</p>
            <div ref={tableQr} className="bg-white">
              {url && <QrCode value={tableQrUrl(url, table)} size={160} />}
            </div>
            <p className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>
              {t("menuTheme.table")} {table}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => downloadQrPng(tableQr.current, `table-${table}-qr.png`)} className={clsx(CARD_BUTTON, "!max-w-none flex-1")}>
              <span className="grid size-6 place-items-center">
                <MenuIcon name="menu-download.svg" size={21.5} />
              </span>
              {t("menuTheme.downloadQr")}
            </button>
            <button
              type="button"
              onClick={() => setTableOpen(false)}
              className={clsx("h-9 rounded-[8px] px-4 text-[12px] font-bold leading-3 hover:brightness-95", SURFACE_SUBTLE, TEXT_GRAY)}
            >
              {t("menuTheme.close")}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
