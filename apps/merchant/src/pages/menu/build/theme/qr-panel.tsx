// The QR block under the Theme step's preview, and the two large preview
// buttons the frame draws beneath it.
//
// The code is drawn from the Public Link Builder's own encoder rather than a
// new dependency — one QR implementation in the app, and it already renders the
// same kind of link.
import { useRef, useState } from "react";
import { Download, ExternalLink, QrCode as QrIcon } from "lucide-react";
import { Modal, Select } from "@ui/primitives";
import { QrCode } from "@/pages/public-link/ui/qr-code";
import { useI18n } from "@/app/providers/i18n-provider";
import { downloadQrPng, tableQrUrl } from "./public-url";

const TABLES = Array.from({ length: 30 }, (_, i) => i + 1);

const ACCENT_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-[9px] border border-[var(--octo-accent)] bg-[var(--octo-card)] font-semibold text-[var(--octo-accent)] transition-colors hover:bg-[var(--octo-selected)]";

export function QrPanel({ url }: { url: string }) {
  const { t } = useI18n();
  const menuQr = useRef<HTMLDivElement>(null);
  const tableQr = useRef<HTMLDivElement>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [table, setTable] = useState(1);

  return (
    <>
      <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 text-center">
        <p className="text-[17px] font-medium text-[var(--octo-text-primary)]">{t("menuTheme.scanTitle")}</p>

        {/* White ground in both themes: an inverted code does not scan. */}
        <div ref={menuQr} className="mx-auto mt-3 w-fit rounded-[10px] bg-white p-1">
          <QrCode value={url} size={168} />
        </div>
        <p className="mt-1 break-all text-[11.5px] text-[var(--octo-text-muted)]" dir="ltr">{url}</p>

        <button
          type="button"
          onClick={() => downloadQrPng(menuQr.current, "menu-qr.png")}
          className={`${ACCENT_OUTLINE} mx-auto mt-3 w-full max-w-[280px] px-4 py-2 text-[14px]`}
        >
          <Download size={16} aria-hidden />
          {t("menuTheme.downloadQr")}
        </button>
      </section>

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

      <Modal
        open={tableOpen}
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
            <QrCode value={tableQrUrl(url, table)} size={176} />
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
