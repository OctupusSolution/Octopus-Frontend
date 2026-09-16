// Real client for the Identity module's AdminApi endpoints — `/v1/accounts/*`
// and `/v1/auth/*`. See
// E:\Octupus\octopus-backend\src\Modules\Identity\...\Accounts\AuthEndpoints.cs
// / AccountEndpoints.cs for the source of truth.
//
// `register` needs an Idempotency-Key (the only Identity endpoint that does)
// — callers pass one explicitly since apiRequest has no built-in generator
// (crypto.randomUUID() is the obvious choice at the call site).
import type {
  BusinessSessionRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  ResendCodeRequest,
  ResendVerificationCodeRequest,
  ResetPasswordRequest,
  TokenResponse,
  VerifyEmailRequest,
} from "../contracts/identity";
import { apiRequest } from "./http";

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
 *  carrying `octupus_tid`. Requires the caller to already be authenticated
 *  (apiRequest sends whatever token configureHttp's getAccessToken returns —
 *  callers must have that pointed at the ACCOUNT token, not a stale business
 *  one, before calling this). */
export function businessSession(request: BusinessSessionRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/v1/auth/business-session", { method: "POST", body: request });
}
