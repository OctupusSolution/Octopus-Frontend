// Real client for the Identity module's AdminApi endpoints — `/v1/accounts/*`
// and `/v1/auth/*`. See
// E:\Octupus\octopus-backend\src\Modules\Identity\...\Accounts\AuthEndpoints.cs
// / AccountEndpoints.cs for the source of truth.
//
// `register` needs an Idempotency-Key (the only Identity endpoint that does)
// — callers pass one explicitly since apiRequest has no built-in generator
// (crypto.randomUUID() is the obvious choice at the call site).
import type {
  ApprovalPinStatusResponse,
  BusinessSessionRequest,
  ClearApprovalPinRequest,
  ExternalLinkChallenge,
  ExternalLinkConfirmationRequest,
  ExternalProviderCode,
  ExternalSignInRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  ResendCodeRequest,
  ResendVerificationCodeRequest,
  ResetPasswordRequest,
  SetApprovalPinRequest,
  TokenResponse,
  VerifyEmailRequest,
} from "../contracts/identity";
import { ApiError, apiRequest, type ProblemDetails } from "./http";

export function register(request: RegisterRequest, idempotencyKey: string): Promise<void> {
  return apiRequest<void>("/v1/accounts/register", { method: "POST", body: request, idempotencyKey });
}

export function verifyEmail(request: VerifyEmailRequest): Promise<void> {
  return apiRequest<void>("/v1/accounts/verify-email", { method: "POST", body: request });
}

export function resendVerificationCode(request: ResendVerificationCodeRequest): Promise<void> {
  return apiRequest<void>("/v1/accounts/resend-verification-code", { method: "POST", body: request });
}

export function login(request: LoginRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/v1/auth/login", { method: "POST", body: request });
}

export function refresh(request: RefreshRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/v1/auth/refresh", { method: "POST", body: request });
}

export function forgotPassword(request: ForgotPasswordRequest): Promise<void> {
  return apiRequest<void>("/v1/auth/forgot-password", { method: "POST", body: request });
}

export function resendCode(request: ResendCodeRequest): Promise<void> {
  return apiRequest<void>("/v1/auth/resend-code", { method: "POST", body: request });
}

export function resetPassword(request: ResetPasswordRequest): Promise<void> {
  return apiRequest<void>("/v1/auth/reset-password", { method: "POST", body: request });
}

/** Exchanges the account-level access token for a business-scoped one
 *  carrying `octupus_tid`. The backend refuses this call (404) when the caller
 *  already holds a business token, so `accountToken` must be passed explicitly
 *  — it overrides whatever the configured token provider would send, and is
 *  never auto-refreshed (the caller renews the account token and retries). */
export function businessSession(request: BusinessSessionRequest, accountToken: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/v1/auth/business-session", { method: "POST", body: request, token: accountToken });
}

// ---- Approval PIN ----------------------------------------------------------------
// Note: http.ts's NO_REFRESH_PATHS contains the "/v1/accounts/" prefix, so an
// expired token on these three answers 401 without the automatic refresh.

export function getApprovalPinStatus(): Promise<ApprovalPinStatusResponse> {
  return apiRequest<ApprovalPinStatusResponse>("/v1/accounts/approval-pin");
}

/** Sets or replaces the caller's approval PIN (204). */
export function setApprovalPin(request: SetApprovalPinRequest): Promise<void> {
  return apiRequest<void>("/v1/accounts/approval-pin", { method: "PUT", body: request });
}

/** Removes the caller's approval PIN (204). The password travels in the DELETE body. */
export function clearApprovalPin(request: ClearApprovalPinRequest): Promise<void> {
  return apiRequest<void>("/v1/accounts/approval-pin", { method: "DELETE", body: request });
}

// ---- External sign-in --------------------------------------------------------------

export function externalSignIn(provider: ExternalProviderCode, request: ExternalSignInRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>(`/v1/auth/external/${provider}`, { method: "POST", body: request });
}

/** Links the external identity behind `challengeToken` to the signed-in
 *  account. Must carry the ACCOUNT token of the account that owns the email. */
export function confirmExternalLink(request: ExternalLinkConfirmationRequest, accountToken?: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/v1/auth/external/confirm-link", {
    method: "POST",
    body: request,
    ...(accountToken !== undefined ? { token: accountToken } : {}),
  });
}

/** The challenge carried by a 409 `identity.external.confirm-link-required`,
 *  or null for any other error. */
export function readExternalLinkChallenge(err: unknown): ExternalLinkChallenge | null {
  if (!(err instanceof ApiError) || err.problem?.errorCode !== "identity.external.confirm-link-required") return null;
  const extensions = err.problem as ProblemDetails & Partial<ExternalLinkChallenge>;
  if (typeof extensions.challengeToken !== "string") return null;
  return { challengeToken: extensions.challengeToken, expiresAtUtc: extensions.expiresAtUtc ?? "" };
}
