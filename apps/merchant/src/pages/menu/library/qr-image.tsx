// The printable QR for one access code (GET /access-codes/{id}/image). The
// route needs the bearer token, so the bytes are fetched and shown through a
// blob URL — a bare <img src> would 403.
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import type { AccessCodeImageFormat } from "@octopus/api-client";
import { describeApiError, fetchAccessCodeImage } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useMenuCopy } from "../copy";

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function QrImage({ codeId, codeKey }: { codeId: string; codeKey: string }) {
  const c = useMenuCopy();
  const { activeBusinessId, user } = useAuth();
  const token = user?.businessToken ?? user?.accessToken ?? null;
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<AccessCodeImageFormat | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;
    let url: string | null = null;
    let cancelled = false;
    setError(null);
    fetchAccessCodeImage(activeBusinessId, codeId, "png", token)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch((err) => !cancelled && setError(describeApiError(err, c("qr.failed"))));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // The token rotates every few minutes; a new one is no reason to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId, codeId]);

  async function download(format: AccessCodeImageFormat) {
    if (!activeBusinessId) return;
    setBusy(format);
    setError(null);
    try {
      saveBlob(await fetchAccessCodeImage(activeBusinessId, codeId, format, token), `menu-qr-${codeKey}.${format}`);
    } catch (err) {
      setError(describeApiError(err, c("qr.failed")));
    } finally {
      setBusy(null);
    }
  }

  const button =
    "inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-3 rounded-[10px] bg-[var(--octo-hover)] p-3">
      <div className="grid h-[132px] w-[132px] shrink-0 place-items-center overflow-hidden rounded-[8px] bg-white">
        {src ? (
          <img src={src} alt={codeKey} className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center text-[11.5px] text-[var(--octo-text-muted)]">{error ? c("qr.failed") : c("loading")}</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {error && (
          <p role="alert" className="text-[12px] text-error">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={busy !== null} onClick={() => void download("png")}>
            <Download size={13} aria-hidden />
            {busy === "png" ? c("loading") : c("qr.download")}
          </button>
          <button type="button" className={button} disabled={busy !== null} onClick={() => void download("svg")}>
            <Download size={13} aria-hidden />
            {busy === "svg" ? c("loading") : c("qr.downloadSvg")}
          </button>
        </div>
      </div>
    </div>
  );
}
