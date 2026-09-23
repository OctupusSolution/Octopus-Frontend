// Mirrors the Identity module's AuthEndpoints.cs / AccountEndpoints.cs
// response and request shapes — see
// E:\Octupus\octopus-backend\src\Modules\Identity\...\Accounts\*.cs
//
// Known gaps versus what the merchant console's UI wants (see
// FRONTEND_INTEGRATION_GAPS.md items 1.1/1.2): there is no GET /v1/accounts/me
// (so `name` is not something the backend gives back after login — the UI
// still derives a display name from the email locally) and no logout/revoke
// endpoint.

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationCodeRequest {
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResendCodeRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export interface BusinessSessionRequest {
  businessId: string;
}

// ---- Approval PIN (US-016, ADR-067) — AccountEndpoints.cs MapApprovalPinEndpoints ----
// PUT sets *or* replaces (204); DELETE clears (204, password in the body);
// GET reports status only — never the PIN. 4–6 digits; all-same-digit and
// complete ascending/descending runs ("1234", "654321") are refused as
// `identity.approval-pin.too-weak`. A wrong password answers the generic
// 401 `identity.auth.invalid-credentials`; a social-only account (no
// password) gets 422 `identity.approval-pin.password-required`.

export const APPROVAL_PIN_MIN_DIGITS = 4;
export const APPROVAL_PIN_MAX_DIGITS = 6;

export interface ApprovalPinStatusResponse {
  isSet: boolean;
  /** When the PIN last changed; null when none is set. */
  updatedAtUtc: string | null;
  /** When a lockout (after 5 wrong PINs) ends; null when usable. */
  lockedUntilUtc: string | null;
}

export interface SetApprovalPinRequest {
  currentPassword: string;
  pin: string;
}

export interface ClearApprovalPinRequest {
  currentPassword: string;
}

// ---- External (social) sign-in — AuthEndpoints.cs ------------------------------
// POST /v1/auth/external/{provider} (anonymous) with the provider's OIDC
// id_token as `credential`: 200 = existing linked account, 201 = new account
// created (both a TokenResponse). When the provider's verified email already
// belongs to a password account, the answer is 409
// `identity.external.confirm-link-required` with `challengeToken` and
// `expiresAtUtc` (10 minutes) as ProblemDetails extensions. The owner then
// signs in with their password and POSTs /v1/auth/external/confirm-link
// (authenticated, account token) with that challenge to link the identity.

export type ExternalProviderCode = "google" | "apple" | "microsoft";

export interface ExternalSignInRequest {
  /** Opaque provider credential — the Google/Apple/Microsoft OIDC id_token. */
  credential: string;
}

export interface ExternalLinkConfirmationRequest {
  challengeToken: string;
}

/** The two extensions on the 409 confirm-link-required problem. */
export interface ExternalLinkChallenge {
  challengeToken: string;
  expiresAtUtc: string;
}
