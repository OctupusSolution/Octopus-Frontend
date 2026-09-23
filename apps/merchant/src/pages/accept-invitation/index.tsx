// Accepting a staff invitation: POST /v1/staff/invitations/accept { token }.
//
// The route sits outside every business: the invitee is authenticated by their
// ACCOUNT session (they are not a member of anything yet), so the account token
// is sent explicitly even when a business token is active. The token arrives on
// the invitation link as `?token=…` (a `<business>.<secret>` base64url string,
// at most 512 chars). Every failure — unknown, expired, used, revoked, or an
// account already in that business — answers the same 404
// `staff.invitation.unavailable`, so this page cannot and does not say which.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, CircleAlert, Loader2, MailOpen } from "lucide-react";
import { ApiError, acceptStaffInvitation, type AcceptInvitationResponse } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";

const STASH_KEY = "octopus.pendingStaffInvitation";
const MAX_TOKEN_LENGTH = 512;

function readStash(): string | null {
  try {
    return window.sessionStorage.getItem(STASH_KEY);
  } catch {
    return null;
  }
}

function writeStash(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(STASH_KEY, token);
    else window.sessionStorage.removeItem(STASH_KEY);
  } catch {
    // Storage blocked (private mode) — the link itself still carries the token.
  }
}

export function hasPendingInvitation(): boolean {
  return readStash() !== null;
}

/** Accepts a bare token or a pasted invitation link. */
function tokenFrom(input: string): string {
  const trimmed = input.trim();
  const match = /[?&]token=([^&#\s]+)/.exec(trimmed);
  return match ? decodeURIComponent(match[1]) : trimmed;
}

const BUTTON =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50";

export function AcceptInvitationPage() {
  const { locale, dir } = useI18n();
  const tx = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const { isAuthenticated, user, selectBusiness } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromLink = params.get("token");
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState<"idle" | "accepting" | "opening">("idle");
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<AcceptInvitationResponse | null>(null);

  // Kept for the length of the tab so a sign-in detour does not lose the link.
  useEffect(() => {
    if (fromLink) writeStash(fromLink);
  }, [fromLink]);

  const token = useMemo(() => fromLink ?? readStash() ?? (manual ? tokenFrom(manual) : ""), [fromLink, manual]);
  const tokenValid = token.length > 0 && token.length <= MAX_TOKEN_LENGTH;

  const accept = async () => {
    if (!user || !tokenValid) return;
    setStatus("accepting");
    setError(null);
    try {
      const res = await acceptStaffInvitation(token, user.accessToken);
      writeStash(null);
      setAccepted(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        writeStash(null);
        setError(
          tx(
            "This invitation can't be used. It may have expired, been replaced by a newer one, been withdrawn, or already been accepted. Ask your manager to send a new invitation.",
            "لا يمكن استخدام هذه الدعوة. ربما انتهت صلاحيتها أو استُبدلت بدعوة أحدث أو سُحبت أو قُبلت من قبل. اطلب من مديرك إرسال دعوة جديدة."
          )
        );
      } else if (err instanceof ApiError && err.status === 429) {
        setError(tx("Too many attempts. Wait a few minutes and try again.", "محاولات كثيرة. انتظر بضع دقائق ثم حاول مجددًا."));
      } else if (err instanceof ApiError && err.status === 401) {
        setError(tx("Your session has expired. Sign out and sign in again, then reopen the invitation link.", "انتهت جلستك. سجّل الخروج ثم الدخول مجددًا وافتح رابط الدعوة من جديد."));
      } else {
        setError(tx("Something went wrong. Check your connection and try again.", "حدث خطأ. تحقق من الاتصال وحاول مجددًا."));
      }
    } finally {
      setStatus("idle");
    }
  };

  const openBusiness = async () => {
    if (!accepted) return;
    setStatus("opening");
    setError(null);
    try {
      await selectBusiness(accepted.businessId);
      navigate("/", { replace: true });
    } catch {
      setStatus("idle");
      setError(tx("You joined, but the business could not be opened yet. Pick it from your businesses.", "انضممت بنجاح، لكن تعذّر فتح النشاط الآن. اختره من قائمة أنشطتك."));
    }
  };

  return (
    <div dir={dir} className="flex min-h-screen items-center justify-center bg-[var(--octo-app-bg)] px-4 py-10">
      <main className="w-full max-w-[440px] rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-6 py-7 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.25)]">
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-[var(--octo-selected)] text-[#0D6EFD]">
          {accepted ? <CheckCircle2 size={24} /> : <MailOpen size={24} />}
        </span>
        <h1 className="mt-4 text-[21px] font-bold leading-tight text-[var(--octo-text-primary)]">
          {accepted ? tx("You're on the team", "انضممت إلى الفريق") : tx("Staff invitation", "دعوة للانضمام إلى الفريق")}
        </h1>

        {accepted ? (
          <>
            <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">
              {tx(
                "Your account is now linked to your staff profile. What you can see and do depends on the role your manager gave you.",
                "أصبح حسابك مرتبطًا بملفك كموظف. ما يمكنك رؤيته وفعله يعتمد على الدور الذي منحك إياه مديرك."
              )}
            </p>
            <button type="button" onClick={() => void openBusiness()} disabled={status !== "idle"} className={`${BUTTON} mt-6 bg-[#0D6EFD] text-white hover:bg-[#0b5ed7]`}>
              {status === "opening" && <Loader2 size={18} className="animate-spin" aria-hidden />}
              {tx("Open the business", "فتح النشاط")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/select-business", { replace: true })}
              className={`${BUTTON} mt-2 border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]`}
            >
              {tx("See all my businesses", "عرض كل أنشطتي")}
            </button>
          </>
        ) : !isAuthenticated ? (
          <>
            <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">
              {tx(
                "Sign in (or create an account with the email the invitation was sent to), then open the invitation link again to accept it.",
                "سجّل الدخول (أو أنشئ حسابًا بالبريد الذي وصلتك عليه الدعوة)، ثم افتح رابط الدعوة مجددًا لقبولها."
              )}
            </p>
            <button type="button" onClick={() => navigate("/login")} className={`${BUTTON} mt-6 bg-[#0D6EFD] text-white hover:bg-[#0b5ed7]`}>
              {tx("Sign in", "تسجيل الدخول")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className={`${BUTTON} mt-2 border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]`}
            >
              {tx("Create an account", "إنشاء حساب")}
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">
              {tx(
                `You're signed in as ${user?.email ?? ""}. Accepting links this account to the staff profile the invitation was issued for.`,
                `أنت مسجّل الدخول باسم ${user?.email ?? ""}. القبول يربط هذا الحساب بملف الموظف الذي صدرت له الدعوة.`
              )}
            </p>
            {!fromLink && !readStash() && (
              <div className="mt-4 flex flex-col gap-1.5">
                <label htmlFor="invite-token" className="text-[13px] font-medium text-[var(--octo-text-primary)]">
                  {tx("Invitation link or code", "رابط الدعوة أو رمزها")}
                </label>
                <input
                  id="invite-token"
                  dir="ltr"
                  autoComplete="off"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="https://…?token=…"
                  className="h-11 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[14px] text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/20"
                />
                {manual && !tokenValid && (
                  <span className="text-[12px] text-[var(--octo-tone-danger-text)]">{tx("That doesn't look like an invitation code.", "هذا لا يبدو رمز دعوة.")}</span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => void accept()}
              disabled={!tokenValid || status !== "idle"}
              className={`${BUTTON} mt-6 bg-[#0D6EFD] text-white hover:bg-[#0b5ed7]`}
            >
              {status === "accepting" && <Loader2 size={18} className="animate-spin" aria-hidden />}
              {tx("Accept invitation", "قبول الدعوة")}
            </button>
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-[10px] bg-[var(--octo-tone-danger-bg)] px-3 py-2.5 text-[13px] text-[var(--octo-tone-danger-text)]">
            <CircleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </main>
    </div>
  );
}
