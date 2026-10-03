// "Approval PIN" management — GET/PUT/DELETE /v1/accounts/approval-pin
// (Identity AccountEndpoints.cs). The backend asks for this PIN on sensitive
// actions (waiting-list remove, order void/refund, ...), and until now there
// was no way to set one (BACKEND_GAPS 5.4).
//
// Setting, changing and clearing all need the account's current password in
// the same request; the PIN itself is never returned by any endpoint, so the
// dialog only ever shows whether one is set.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import {
  APPROVAL_PIN_MAX_DIGITS,
  APPROVAL_PIN_MIN_DIGITS,
  ApiError,
  clearApprovalPin,
  getApprovalPinStatus,
  setApprovalPin,
  type ApprovalPinStatusResponse,
} from "@octopus/api-client";
import { Button, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { fillText, useSessionText, type SessionText } from "../_shared/session-text";

const WRONG_PASSWORD = "identity.auth.invalid-credentials";

/** Mirrors the backend's ApprovalPinStrength: every digit the same, or one
 *  complete ascending/descending run, is refused. */
export function isWeakPin(pin: string): boolean {
  if (pin.length === 0) return true;
  const same = [...pin].every((c) => c === pin[0]);
  const run = (step: number) => [...pin].every((c, i) => i === 0 || c.charCodeAt(0) - pin.charCodeAt(i - 1) === step);
  return same || run(1) || run(-1);
}

export function pinShapeError(pin: string, confirm: string, text: SessionText): string | null {
  const shape = new RegExp(`^[0-9]{${APPROVAL_PIN_MIN_DIGITS},${APPROVAL_PIN_MAX_DIGITS}}$`);
  if (!shape.test(pin)) return text.pinErrDigits;
  if (isWeakPin(pin)) return text.pinErrWeak;
  if (pin !== confirm) return text.pinErrMismatch;
  return null;
}

function describePinError(err: unknown, text: SessionText): string {
  if (!(err instanceof ApiError)) return text.pinErrGeneric;
  const code = err.problem?.errorCode;
  if (code === WRONG_PASSWORD) return text.pinErrWrongPassword;
  if (code === "identity.approval-pin.too-weak") return text.pinErrWeak;
  if (code === "identity.approval-pin.password-required") return text.pinErrNoPassword;
  if (err.status === 429) return text.pinErrRateLimited;
  if (err.status === 401) return text.pinErrSession;
  if (err.status === 422 || err.status === 400) return text.pinErrDigits;
  return text.pinErrGeneric;
}

type View = "status" | "set" | "clear";

export function ApprovalPinDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const text = useSessionText();
  const { locale } = useI18n();
  const [status, setStatus] = useState<ApprovalPinStatusResponse | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<View>("status");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoadState("loading");
    getApprovalPinStatus()
      .then((next) => {
        setStatus(next);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, []);

  useEffect(() => {
    if (!open) return;
    setView("status");
    setNotice(null);
    resetForm();
    load();
    // Reload only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function resetForm() {
    setPassword("");
    setPin("");
    setConfirmPin("");
    setError(null);
  }

  function goTo(next: View) {
    resetForm();
    setNotice(null);
    setView(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return setError(text.pinErrPasswordRequired);
    if (view === "set") {
      const shape = pinShapeError(pin, confirmPin, text);
      if (shape) return setError(shape);
    }
    setBusy(true);
    setError(null);
    try {
      if (view === "set") await setApprovalPin({ currentPassword: password, pin });
      else await clearApprovalPin({ currentPassword: password });
      setNotice(view === "set" ? text.pinSaved : text.pinRemoved);
      resetForm();
      setView("status");
      load();
    } catch (err) {
      setError(describePinError(err, text));
    } finally {
      setBusy(false);
    }
  }

  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  const footer =
    view === "status" ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          {text.pinClose}
        </Button>
        {status?.isSet && (
          <Button variant="secondary" className="!text-error" onClick={() => goTo("clear")}>
            {text.pinRemove}
          </Button>
        )}
        <Button variant="primary" disabled={loadState !== "ready"} onClick={() => goTo("set")}>
          {status?.isSet ? text.pinChange : text.pinSetUp}
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={() => goTo("status")} disabled={busy}>
          {text.pinBack}
        </Button>
        <Button
          variant={view === "clear" ? "danger" : "primary"}
          type="submit"
          form="approval-pin-form"
          disabled={busy}
        >
          {view === "clear" ? (busy ? text.pinRemoving : text.pinRemoveConfirm) : busy ? text.pinSaving : text.pinSave}
        </Button>
      </>
    );

  return (
    <Modal open={open} onClose={onClose} title={text.pinTitle} className="max-w-md" footer={footer}>
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{text.pinIntro}</p>

      {notice && (
        <p role="status" className="mt-3 rounded-[9px] bg-[var(--octo-tone-success-bg)] px-3 py-2 text-[12.5px] text-[var(--octo-tone-success-text)]">
          {notice}
        </p>
      )}

      {view === "status" ? (
        <div className="mt-4 rounded-xl border border-[var(--octo-border-card)] px-[18px] py-[15px]">
          {loadState === "loading" && <p className="text-[12.5px] text-[var(--octo-text-muted)]">{text.pinLoading}</p>}
          {loadState === "error" && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12.5px] text-error">{text.pinLoadFailed}</p>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={load} aria-label={text.pinLoadFailed} />
            </div>
          )}
          {loadState === "ready" && status && (
            <div className="flex items-start gap-3">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  status.isSet ? "bg-[#22C55E]/10 text-[#16a34a]" : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"
                }`}
              >
                {status.isSet ? <ShieldCheck size={16} /> : <KeyRound size={16} />}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
                  {status.isSet ? text.pinStatusSet : text.pinStatusNotSet}
                </p>
                {status.isSet && status.updatedAtUtc && (
                  <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                    {fillText(text.pinStatusSetOn, { when: when(status.updatedAtUtc) })}
                  </p>
                )}
                {status.lockedUntilUtc && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-[#F59E0B]">
                    <Lock size={12} />
                    {fillText(text.pinLocked, { when: when(status.lockedUntilUtc) })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form id="approval-pin-form" onSubmit={(e) => void submit(e)} noValidate className="mt-4 flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
              {error}
            </p>
          )}
          <Input
            label={text.pinCurrentPassword}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {view === "set" && (
            <>
              <Input
                label={text.pinNew}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={APPROVAL_PIN_MAX_DIGITS}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
              <Input
                label={text.pinConfirm}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={APPROVAL_PIN_MAX_DIGITS}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              />
            </>
          )}
        </form>
      )}
    </Modal>
  );
}

export function useApprovalPinTitle(): string {
  return useSessionText().pinTitle;
}

/** A small text button that opens the dialog — for forms that ask for the
 *  PIN (e.g. the waitlist's remove confirmation). */
export function ManageApprovalPinLink({ className }: { className?: string }) {
  const text = useSessionText();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-[11.5px] font-medium text-[#0D6EFD] hover:underline ${className ?? ""}`}
      >
        {text.pinManageLink}
      </button>
      <ApprovalPinDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
