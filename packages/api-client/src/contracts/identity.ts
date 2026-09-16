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
