// The three provider buttons plus the "Or" rule, identical on Sign In and
// Create Account. Each button produces a provider credential (see
// external-providers.ts) and hands it up; the caller exchanges it with
// POST /v1/auth/external/{provider}. A provider with no client-side config
// stays visible but disabled, so the row keeps its designed shape.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ExternalProviderCode } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { GoogleIcon, MicrosoftIcon, AppleIcon } from "../login/social-icons";
import {
  emailFromIdToken,
  fakeCredential,
  providerMode,
  renderGoogleButton,
} from "./external-providers";
import { fillText, useSessionText } from "./session-text";
import { PROVIDER_NAME } from "./use-external-sign-in";

export type SocialProvider = ExternalProviderCode;

type LabelKey = "auth.continueWithGoogle" | "auth.continueWithApple" | "auth.continueWithMicrosoft";

const PROVIDERS: { id: SocialProvider; icon: JSX.Element; labelKey: LabelKey }[] = [
  { id: "google", icon: <GoogleIcon size={18} />, labelKey: "auth.continueWithGoogle" },
  { id: "apple", icon: <AppleIcon size={18} />, labelKey: "auth.continueWithApple" },
  { id: "microsoft", icon: <MicrosoftIcon size={18} />, labelKey: "auth.continueWithMicrosoft" },
];

const BUTTON_CLASS =
  "flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 text-[13.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:border-[var(--octo-text-faint)] hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--octo-border-input)] disabled:hover:bg-[var(--octo-card)]";

export interface SocialRowProps {
  /** A credential the provider issued, plus its email when known. */
  onCredential: (provider: SocialProvider, credential: string, email: string | null) => void;
  /** The provider whose exchange is in flight, if any. */
  busy?: SocialProvider | null;
  /** Which wording Google's own button uses. */
  intent?: "signin" | "signup";
}

export function SocialRow({ onCredential, busy = null, intent = "signin" }: SocialRowProps) {
  const { t } = useI18n();
  const text = useSessionText();

  function pickFake(provider: SocialProvider) {
    const email = window.prompt(fillText(text.devPrompt, { provider: PROVIDER_NAME[provider] }));
    if (!email?.trim()) return;
    onCredential(provider, fakeCredential(provider, email), email.trim());
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PROVIDERS.map(({ id, icon, labelKey }) => {
          const mode = providerMode(id);
          const label = (
            <>
              <span className="shrink-0">{icon}</span>
              <span className="whitespace-nowrap">{t(labelKey)}</span>
            </>
          );
          if (mode === "google-gis") {
            return (
              <GoogleButtonCell key={id} intent={intent} disabled={busy !== null} onCredential={onCredential}>
                {label}
              </GoogleButtonCell>
            );
          }
          return (
            <button
              key={id}
              type="button"
              disabled={mode === "unavailable" || busy !== null}
              title={mode === "unavailable" ? text.socialNotConfigured : undefined}
              onClick={() => pickFake(id)}
              className={BUTTON_CLASS}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-[var(--octo-border-card)]" />
        <span className="text-[15px] text-[var(--octo-text-muted)]">{t("auth.or")}</span>
        <span className="h-px flex-1 bg-[var(--octo-border-card)]" />
      </div>
    </>
  );
}

// Google Identity Services only issues an id_token from its own rendered
// button, so this cell shows our placeholder until GIS has drawn its button
// into the same slot (and keeps the placeholder, disabled, if GIS can't load).
function GoogleButtonCell({
  intent,
  disabled,
  onCredential,
  children,
}: {
  intent: "signin" | "signup";
  disabled: boolean;
  onCredential: SocialRowProps["onCredential"];
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const text = useSessionText();
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  // The GIS callback is registered once per render of the button; a ref keeps
  // it pointed at the latest handler without re-rendering Google's iframe.
  const handler = useRef(onCredential);
  handler.current = onCredential;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let alive = true;
    setState("loading");
    renderGoogleButton(el, { width: el.clientWidth || 240, locale, text: intent === "signup" ? "signup_with" : "continue_with" }, (idToken) =>
      handler.current("google", idToken, emailFromIdToken(idToken))
    )
      .then(() => alive && setState("ready"))
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, [locale, intent]);

  return (
    <div className="relative h-[54px]">
      <div
        ref={host}
        aria-hidden={state !== "ready"}
        className={`flex h-full items-center justify-center ${state === "ready" ? "" : "invisible absolute inset-0"} ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
      />
      {state !== "ready" && (
        <button type="button" disabled className={BUTTON_CLASS} title={state === "failed" ? text.socialNotConfigured : undefined}>
          {children}
        </button>
      )}
    </div>
  );
}
