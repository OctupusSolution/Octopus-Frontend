// QR access codes for one menu: BACKEND_GAPS.md 2.13/6b-adjacent — the
// endpoints (list/create/regenerate/revoke) were ready and wired nowhere.
// A code opens this exact menu (AccessCodeKind.MenuDirect) — the other kind,
// BranchEntry, needs a real branchId, which the Branches endpoint this
// codebase is still missing (BACKEND_GAPS.md 0.1) can't supply yet.
//
// The image endpoint returns raw bytes from an authenticated route, so it
// cannot be a plain <img src> (the browser sends no bearer token for that).
// QrImage fetches it as a blob with the session token for the on-screen
// preview and the PNG/SVG downloads; the printable URL keeps its copy button.
import { useEffect, useState } from "react";
import { Check, Copy, Image as ImageIcon, QrCode, RotateCcw, XCircle } from "lucide-react";
import { Badge, Modal } from "@ui/primitives";
import { ApiError, createAccessCode, listAccessCodes, regenerateAccessCode, revokeAccessCode, type AccessCodeResponse } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Menu } from "@/entities/menu";
import { QrImage } from "./qr-image";
import { useMenuCopy } from "../copy";

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function AccessCodesModal({ menu, onClose }: { menu: Menu | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [codes, setCodes] = useState<AccessCodeResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageFor, setImageFor] = useState<string | null>(null);
  const c = useMenuCopy();

  function describe(err: unknown): string {
    return err instanceof ApiError ? (err.problem?.detail ?? err.problem?.errorCode ?? err.message) : "Request failed";
  }

  function load() {
    if (!menu || !activeBusinessId) return;
    setError(null);
    listAccessCodes(activeBusinessId)
      .then((res) => setCodes(res.data.filter((c) => c.menuId === menu.id)))
      .catch((err) => setError(describe(err)));
  }

  useEffect(() => {
    setCodes(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, activeBusinessId]);

  if (!menu) return null;

  async function create() {
    if (!activeBusinessId || !menu) return;
    setBusy(true);
    setError(null);
    try {
      await createAccessCode(activeBusinessId, { businessId: activeBusinessId, kind: "MenuDirect", branchId: null, menuId: menu.id }, key());
      load();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(codeId: string) {
    if (!activeBusinessId) return;
    setBusy(true);
    setError(null);
    try {
      await regenerateAccessCode(activeBusinessId, codeId, key());
      load();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(codeId: string) {
    if (!activeBusinessId) return;
    setBusy(true);
    setError(null);
    try {
      await revokeAccessCode(activeBusinessId, codeId);
      load();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy(code: AccessCodeResponse) {
    try {
      await navigator.clipboard.writeText(code.printableUrl);
      setCopiedId(code.accessCodeId);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard access can throw (permissions, insecure context); the
      // button simply doesn't flip to "Copied".
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" });
  }

  const active = codes?.filter((c) => c.status.toLowerCase() === "active") ?? [];

  return (
    <Modal open onClose={onClose} className="max-w-[560px]">
      <div className="flex items-center gap-2.5">
        <QrCode size={20} className="text-[var(--octo-text-secondary)]" />
        <h2 className="text-[18px] font-semibold text-[var(--octo-text-primary)]">{t("accessCodes.title")}</h2>
      </div>
      <p className="mt-1 text-[13.5px] text-[var(--octo-text-secondary)]">{menu.name}</p>

      {error && (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}

      <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
        {codes === null ? (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("common.loading")}</p>
        ) : codes.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("accessCodes.empty")}</p>
        ) : (
          codes.map((code) => {
            const isActive = code.status.toLowerCase() === "active";
            return (
              <div key={code.accessCodeId} className="rounded-[10px] border border-[var(--octo-border-card)] px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span dir="ltr" className="truncate text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                        {code.key}
                      </span>
                      <Badge tone={isActive ? "success" : "neutral"}>{isActive ? t("accessCodes.active") : t("accessCodes.revoked")}</Badge>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--octo-text-muted)]">
                      {t("accessCodes.createdOn").replace("{date}", formatDate(code.createdAtUtc))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(code)}
                    className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
                  >
                    {copiedId === code.accessCodeId ? <Check size={13} /> : <Copy size={13} />}
                    {copiedId === code.accessCodeId ? t("accessCodes.copied") : t("accessCodes.copyLink")}
                  </button>
                </div>
                {isActive && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--octo-divider)] pt-2.5">
                    <button
                      type="button"
                      aria-expanded={imageFor === code.accessCodeId}
                      onClick={() => setImageFor((id) => (id === code.accessCodeId ? null : code.accessCodeId))}
                      className="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-medium text-[var(--octo-accent)] transition-colors hover:bg-[var(--octo-hover)]"
                    >
                      <ImageIcon size={13} />
                      {imageFor === code.accessCodeId ? c("qr.hide") : c("qr.show")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void regenerate(code.accessCodeId)}
                      className="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={13} />
                      {t("accessCodes.regenerate")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void revoke(code.accessCodeId)}
                      className="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-medium text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle size={13} />
                      {t("accessCodes.revoke")}
                    </button>
                  </div>
                )}
                {isActive && imageFor === code.accessCodeId && <QrImage codeId={code.accessCodeId} codeKey={code.key} />}
              </div>
            );
          })
        )}
      </div>

      {active.length === 0 && (
        <button
          type="button"
          disabled={busy || codes === null}
          onClick={() => void create()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#0D6EFD] py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <QrCode size={15} />
          {t("accessCodes.create")}
        </button>
      )}
    </Modal>
  );
}
