// The member's sign-in state and, while an invitation is outstanding, the two
// things that can be done about it: send a fresh one
// (POST /members/{id}/invitations/resend — a NEW token; the old mail stops
// working) or withdraw it (DELETE /members/{id}/invitations). Both are
// rate-limited per member on the server and carry the member's version.
import { useState } from "react";
import { Loader2, MailCheck, RotateCw, XCircle } from "lucide-react";
import { resendStaffInvitation, revokeStaffInvitation, type StaffAccountAccess } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { useStaffStore } from "./_shared/staff-store";
import { memberVersion, serverMemberIdOrNull } from "./_shared/staff-sync";
import { StatusPill, type PillTone } from "./_shared/status-pill";
import { staffErrorText, useTx } from "./_shared/text";

const ACCESS_TONE: Record<StaffAccountAccess, PillTone> = {
  None: "neutral",
  Invited: "info",
  Enabled: "success",
  Disabled: "neutral",
  Locked: "danger",
};

export function InvitationPanel({
  employeeId,
  notify,
}: {
  employeeId: string;
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const tx = useTx();
  const { locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const store = useStaffStore();
  const [busy, setBusy] = useState<"resend" | "revoke" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = store.metaOf(employeeId);
  const sid = serverMemberIdOrNull(employeeId);
  if (!meta || !sid) return null;

  const accessText: Record<StaffAccountAccess, string> = {
    None: tx("No sign-in", "بدون تسجيل دخول"),
    Invited: tx("Invitation pending", "دعوة بانتظار القبول"),
    Enabled: tx("Signed-in account linked", "حساب مرتبط"),
    Disabled: tx("Sign-in disabled", "تسجيل الدخول معطّل"),
    Locked: tx("Locked", "مقفل"),
  };

  const act = async (kind: "resend" | "revoke") => {
    if (!activeBusinessId) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "resend") {
        const res = await resendStaffInvitation(activeBusinessId, sid, memberVersion(employeeId));
        const until = res.expiresAtUtc
          ? new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(res.expiresAtUtc))
          : "";
        notify(
          tx(
            `New invitation sent${res.maskedEmail ? ` to ${res.maskedEmail}` : ""}${until ? ` — valid until ${until}` : ""}.`,
            `تم إرسال دعوة جديدة${res.maskedEmail ? ` إلى ${res.maskedEmail}` : ""}${until ? ` — صالحة حتى ${until}` : ""}.`
          )
        );
      } else {
        await revokeStaffInvitation(activeBusinessId, sid, memberVersion(employeeId));
        notify(tx("Invitation withdrawn. The link in the email no longer works.", "تم سحب الدعوة. الرابط في البريد لم يعد يعمل."));
      }
      await store.refreshMembers([employeeId]);
    } catch (err) {
      setError(staffErrorText(err, tx));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <MailCheck size={18} aria-hidden className="shrink-0 text-[var(--octo-text-secondary)]" />
        <span className="text-[14px] text-[var(--octo-text-primary)]">{tx("Account access", "الوصول إلى الحساب")}</span>
        <StatusPill tone={ACCESS_TONE[meta.accountAccess]} label={accessText[meta.accountAccess]} />
      </div>
      {meta.accountAccess === "Invited" && (
        <>
          <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
            {tx(
              "Sending again issues a new link and cancels the previous one.",
              "إعادة الإرسال تُصدر رابطًا جديدًا وتُلغي الرابط السابق."
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => void act("resend")} className={buttonClass("outline", "sm")}>
              {busy === "resend" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <RotateCw size={16} aria-hidden />}
              {tx("Resend invitation", "إعادة إرسال الدعوة")}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => void act("revoke")} className={buttonClass("dangerSoft", "sm")}>
              {busy === "revoke" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <XCircle size={16} aria-hidden />}
              {tx("Withdraw invitation", "سحب الدعوة")}
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-[12.5px] text-[var(--octo-tone-danger-text)]">
          {error}
        </p>
      )}
    </div>
  );
}
