// External (social) sign-in against the real Identity endpoints:
//   POST /v1/auth/external/{provider}  { credential: <provider id_token> }
//     200 -> an already-linked account, 201 -> a brand-new account; both a
//     TokenResponse, so the merchant is signed in either way.
//     409 identity.external.confirm-link-required -> the provider's verified
//     email already belongs to a password account. The backend never links by
//     email alone: it returns a one-time `challengeToken` (10 minutes), the
//     owner signs in with their password, and then
//   POST /v1/auth/external/confirm-link  { challengeToken }  (account token)
//     links the identity and returns a fresh token pair.
// The link step lives on the sign-in form (see login/index.tsx), because it
// needs the password sign-in to happen first.
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  confirmExternalLink,
  externalSignIn,
  readExternalLinkChallenge,
  type ExternalProviderCode,
  type TokenResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { fillText, useSessionText, type SessionText } from "./session-text";

export const PROVIDER_NAME: Record<ExternalProviderCode, string> = {
  google: "Google",
  apple: "Apple",
  microsoft: "Microsoft",
};

/** A link the backend is waiting for the email's owner to confirm. */
export interface PendingExternalLink {
  provider: ExternalProviderCode;
  challengeToken: string;
  expiresAtUtc: string;
  /** The provider-reported email, when the credential exposed it. */
  email: string | null;
}

/** Router state the sign-up page hands to /login when a link is required. */
export interface ExternalLinkRouteState {
  externalLink: PendingExternalLink;
}

export function readExternalLinkRouteState(state: unknown): PendingExternalLink | null {
  if (!state || typeof state !== "object" || !("externalLink" in state)) return null;
  const link = (state as ExternalLinkRouteState).externalLink;
  return link && typeof link.challengeToken === "string" ? link : null;
}

export function isLinkExpired(link: PendingExternalLink): boolean {
  const at = Date.parse(link.expiresAtUtc);
  return Number.isFinite(at) && at <= Date.now();
}

function describeExternalError(err: unknown, provider: ExternalProviderCode, text: SessionText): string {
  const name = { provider: PROVIDER_NAME[provider] };
  if (err instanceof ApiError) {
    const code = err.problem?.errorCode;
    if (code === "identity.external.provider-unavailable" || code === "identity.external.provider-timeout") {
      return fillText(text.socialProviderDown, name);
    }
    if (code === "identity.external.email-required") return fillText(text.socialEmailRequired, name);
  }
  return fillText(text.socialFailed, name);
}

export function useExternalSignIn(onLinkRequired: (link: PendingExternalLink) => void) {
  const { signInWithTokens } = useAuth();
  const navigate = useNavigate();
  const text = useSessionText();
  const [busy, setBusy] = useState<ExternalProviderCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (provider: ExternalProviderCode, credential: string, email: string | null) => {
      setBusy(provider);
      setError(null);
      try {
        const tokens: TokenResponse = await externalSignIn(provider, { credential });
        // The access token carries no email claim; the provider's is the
        // best label we have (it only feeds the display name).
        signInWithTokens(email ?? "", tokens);
        navigate("/select-business", { replace: true });
      } catch (err) {
        const challenge = readExternalLinkChallenge(err);
        if (challenge) onLinkRequired({ provider, ...challenge, email });
        else setError(describeExternalError(err, provider, text));
      } finally {
        setBusy(null);
      }
    },
    [navigate, onLinkRequired, signInWithTokens, text]
  );

  return { signIn, busy, error, setError };
}

/** Confirms a pending link with the (just signed-in) account's token. */
export function confirmPendingLink(link: PendingExternalLink): Promise<TokenResponse> {
  return confirmExternalLink({ challengeToken: link.challengeToken });
}
