"use strict";
const { R, F, err, T_OK, T_CREATED, T_ACCEPTED, T_NO_CONTENT } = require("./lib");

// A signed-in session, as every token-issuing request returns it. One shape for
// password, social and verified-signup sign-ins, so the client has one handler.
const SESSION = {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo",
  refreshToken: "rt_9f2c4b1e8a",
  tokenType: "Bearer",
  expiresIn: 3600,
  user: {
    id: "usr-001",
    name: "Omar Al-Harbi",
    email: "owner@oceanview.sa",
    role: "owner",
    locale: "ar",
    passwordSet: true,
  },
  activeTenantId: "tenant-ocean-view",
  businesses: [
    { id: "tenant-ocean-view", businessName: "Ocean View Restaurant", vertical: "restaurants", enabledModules: ["core", "orders", "payments", "tax", "reports", "bookings"] },
  ],
};

const SAVE_SESSION = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  userId: "user.id",
  tenantId: "activeTenantId",
};

const auth = F(
  "01 · Login & Account",
  "Everything behind the sign-in screen: password and social sign-in, creating an account, verifying it, recovering a password, and the session itself.\n\n**Run order:** *1.1 → Login* first. It saves `accessToken`, `refreshToken`, `userId` and `tenantId`, and every other request in the collection authenticates from those.\n\nAll requests here are **no-auth** except *1.4 Session*.",
  [
    F(
      "1.1 · Sign in",
      "Screen: `features/session/login`. Email + password, or one of three social providers.",
      [
        R("Login (email + password)", "POST", "/api/v1/auth/login", {
          status: "planned",
          noAuth: true,
          screen: "features/session/login/index.tsx",
          desc: "Primary sign-in. Returns the session: tokens, the user, and every business the account owns — the business switcher reads that list, and `activeTenantId` is the one the console opens on.",
          rules: [
            "`email` required and must be a valid address; `password` required.",
            "Wrong email **or** wrong password returns the same `401 invalid_credentials` — never say which one was wrong (no account enumeration).",
            "Rate-limit by email + IP; answer `429` when exceeded.",
            "`user.passwordSet: false` means the account has no password yet (social or skipped at signup). The console then blocks on *1.4 → Set password (first time)* until it is set.",
          ],
          body: { email: "owner@oceanview.sa", password: "{{password}}", remember: true },
          tests: T_OK,
          saves: SAVE_SESSION,
          examples: [
            { name: "Signed in", body: SESSION },
            err("Wrong email or password", 401, "invalid_credentials", "Email or password is incorrect."),
            err("Missing fields", 422, "validation_failed", "Some fields are invalid.", { email: "required", password: "required" }),
            err("Too many attempts", 429, "rate_limited", "Too many sign-in attempts. Try again in 60 seconds."),
          ],
        }),
        R("Login with Google / Apple / Microsoft", "POST", "/api/v1/auth/oauth/:provider", {
          status: "planned",
          noAuth: true,
          screen: "features/session/login/index.tsx · features/session/signup/index.tsx",
          desc: "The three social buttons on both the sign-in and sign-up screens. Exchanges the provider's authorization code for the same session shape as password login.\n\n`:provider` is `google`, `apple` or `microsoft`.",
          rules: [
            "An unknown provider email creates the account on first sign-in — the sign-up screen has no separate social path.",
            "A social-only account has `user.passwordSet: false`.",
            "Unsupported `:provider` → `404 unknown_provider`.",
          ],
          body: { code: "auth_code_from_provider_redirect", redirectUri: "https://app.octopus.sa/auth/callback" },
          tests: T_OK,
          saves: SAVE_SESSION,
          examples: [
            { name: "Signed in", body: { ...SESSION, user: { ...SESSION.user, passwordSet: false } } },
            err("Provider rejected the code", 401, "invalid_provider_token", "Could not verify the sign-in with the provider."),
          ],
        }),
        R("Refresh access token", "POST", "/api/v1/auth/refresh", {
          status: "planned",
          noAuth: true,
          desc: "Rotates the token pair. Call it when a request answers `401 token_expired`.",
          rules: [
            "Refresh tokens are single-use: the response always carries a new one, and the old one stops working.",
            "Presenting an already-used refresh token revokes the whole session (token theft signal).",
          ],
          body: { refreshToken: "{{refreshToken}}" },
          tests: T_OK,
          saves: { accessToken: "accessToken", refreshToken: "refreshToken" },
          examples: [
            { name: "Rotated", body: { accessToken: "eyJ...rotated", refreshToken: "rt_new_71ac", tokenType: "Bearer", expiresIn: 3600 } },
            err("Refresh token invalid or reused", 401, "invalid_refresh_token", "Please sign in again."),
          ],
        }),
        R("Logout", "POST", "/api/v1/auth/logout", {
          status: "planned",
          desc: "Revokes the current refresh token. The console then clears its local session.",
          body: { refreshToken: "{{refreshToken}}" },
          tests: `${T_NO_CONTENT}\npm.environment.unset("accessToken");\npm.environment.unset("refreshToken");`,
          examples: [{ name: "Signed out", code: 204 }],
        }),
      ]
    ),

    F(
      "1.2 · Create account",
      "Screen: `features/session/signup` → the verify-account code dialog (`auth-dialogs`, step `signUpOtp`).\n\n**Run order:** Create account → Verify email code. Verifying returns the session, exactly like login.",
      [
        R("Create account", "POST", "/api/v1/auth/register", {
          status: "planned",
          noAuth: true,
          screen: "features/session/signup/index.tsx",
          desc: "Creates an unverified account and emails a **4-digit** code. The account cannot sign in until *Verify email code* succeeds.",
          rules: [
            "`fullName`, `email`, `password`, `companyName` all required.",
            "`email` must be valid; `password` at least **8** characters.",
            "An email that already has a verified account → `409 email_taken`.",
            "Re-registering an email that is still unverified replaces the pending code rather than failing, so a merchant who lost the email can simply try again.",
          ],
          body: { fullName: "Omar Al-Harbi", email: "owner@oceanview.sa", password: "{{password}}", companyName: "Ocean View Restaurant" },
          tests: T_CREATED,
          saves: { verificationId: "verificationId" },
          examples: [
            { name: "Code sent", code: 201, body: { verificationId: "ver-5521", email: "owner@oceanview.sa", codeLength: 4, expiresInSeconds: 600, resendAfterSeconds: 60 } },
            err("Email already registered", 409, "email_taken", "An account with this email already exists."),
            err("Invalid fields", 422, "validation_failed", "Some fields are invalid.", { password: "min_length_8", companyName: "required" }),
          ],
        }),
        R("Verify email code", "POST", "/api/v1/auth/register/verify", {
          status: "planned",
          noAuth: true,
          screen: "features/session/auth-dialogs/index.tsx (signUpOtp)",
          desc: "Confirms the 4-digit code and signs the merchant in. Returns the session shape.",
          rules: [
            "`code` is exactly 4 digits.",
            "Wrong code → `422 invalid_code` with `attemptsLeft`; after 5 wrong codes the verification is burned and the merchant must *Resend*.",
            "Expired code (10 minutes) → `422 code_expired`; the merchant must *Resend*.",
          ],
          body: { verificationId: "{{verificationId}}", code: "1234" },
          tests: T_OK,
          saves: SAVE_SESSION,
          examples: [
            { name: "Verified and signed in", body: { ...SESSION, user: { ...SESSION.user, passwordSet: true } } },
            err("Wrong code", 422, "invalid_code", "The code is incorrect.", { attemptsLeft: 3 }),
            err("Code expired", 422, "code_expired", "This code has expired. Request a new one."),
          ],
        }),
        R("Resend verification code", "POST", "/api/v1/auth/register/resend", {
          status: "planned",
          noAuth: true,
          screen: "features/session/auth-dialogs/index.tsx — Resend link",
          desc: "The dialog shows a countdown and only offers *Resend* when it reaches zero; the server enforces the same cooldown.",
          rules: ["Calling before `resendAfterSeconds` has passed → `429 resend_too_soon` with `retryAfterSeconds`."],
          body: { verificationId: "{{verificationId}}" },
          tests: T_ACCEPTED,
          examples: [
            { name: "Re-sent", code: 202, body: { verificationId: "{{verificationId}}", expiresInSeconds: 600, resendAfterSeconds: 60 } },
            err("Too soon", 429, "resend_too_soon", "Please wait before requesting another code.", { retryAfterSeconds: 42 }),
          ],
        }),
      ]
    ),

    F(
      "1.3 · Forgot password",
      "Screen: `features/session/auth-dialogs` — steps `forgot` → `resetOtp` → `setPassword` → `success`.\n\n**Run order:** Request reset code → Verify reset code → Set new password.",
      [
        R("Request reset code", "POST", "/api/v1/auth/password/forgot", {
          status: "planned",
          noAuth: true,
          screen: "auth-dialogs (forgot)",
          desc: "Emails a 4-digit reset code.",
          rules: [
            "**Always** answers `202` with a `resetRequestId`, whether or not the email has an account — never reveal which addresses are registered.",
            "`email` must be a valid address (`422` otherwise — that is not enumeration).",
          ],
          body: { email: "owner@oceanview.sa" },
          tests: T_ACCEPTED,
          saves: { resetRequestId: "resetRequestId" },
          examples: [
            { name: "Accepted", code: 202, body: { resetRequestId: "rst-8812", codeLength: 4, expiresInSeconds: 600, resendAfterSeconds: 60 } },
          ],
        }),
        R("Verify reset code", "POST", "/api/v1/auth/password/verify", {
          status: "planned",
          noAuth: true,
          screen: "auth-dialogs (resetOtp)",
          desc: "Exchanges the code for a short-lived `resetToken`. The next dialog (set a new password) needs it.",
          rules: [
            "Same attempt limit as sign-up verification: 5 wrong codes burn the request.",
            "`resetToken` is single-use and expires in 15 minutes.",
          ],
          body: { resetRequestId: "{{resetRequestId}}", code: "1234" },
          tests: T_OK,
          saves: { resetToken: "resetToken" },
          examples: [
            { name: "Verified", body: { resetToken: "prt_4f81c2", expiresInSeconds: 900 } },
            err("Wrong code", 422, "invalid_code", "The code is incorrect.", { attemptsLeft: 4 }),
          ],
        }),
        R("Set new password", "POST", "/api/v1/auth/password/reset", {
          status: "planned",
          noAuth: true,
          screen: "auth-dialogs (setPassword → success)",
          desc: "Sets the new password. The dialog then shows the success state and returns the merchant to sign in.",
          rules: [
            "`newPassword` at least 8 characters; `confirmPassword` must match it.",
            "Revokes every existing session for the account.",
          ],
          body: { resetToken: "{{resetToken}}", newPassword: "{{newPassword}}", confirmPassword: "{{newPassword}}" },
          tests: T_OK,
          examples: [
            { name: "Password changed", body: { ok: true } },
            err("Passwords do not match", 422, "validation_failed", "Some fields are invalid.", { confirmPassword: "mismatch" }),
            err("Reset token expired", 422, "reset_token_expired", "This reset link has expired. Start again."),
          ],
        }),
      ]
    ),

    F(
      "1.4 · Session",
      "Requests made once signed in.",
      [
        R("Who am I", "GET", "/api/v1/me", {
          status: "planned",
          desc: "Restores the session on page load. Same `user` + `businesses` + `activeTenantId` as login, without tokens.",
          tests: T_OK,
          examples: [
            { name: "Success", body: { user: SESSION.user, activeTenantId: SESSION.activeTenantId, businesses: SESSION.businesses } },
            err("Token expired", 401, "token_expired", "Session expired."),
          ],
        }),
        R("Set password (first time)", "POST", "/api/v1/auth/password/set", {
          status: "planned",
          screen: "pages/set-password",
          desc: "For an account with `passwordSet: false`. Not the same as changing a password — there is no current password to check.",
          rules: [
            "Only allowed while `passwordSet` is `false`; otherwise `409 password_already_set`.",
            "`newPassword` at least 8 characters.",
          ],
          body: { newPassword: "{{newPassword}}" },
          tests: T_OK,
          examples: [
            { name: "Set", body: { ok: true, passwordSet: true } },
            err("Already has a password", 409, "password_already_set", "This account already has a password."),
          ],
        }),
        R("Switch language", "PATCH", "/api/v1/me", {
          status: "planned",
          screen: "features/session/switch-locale",
          desc: "Stores the merchant's UI language. The console renders Arabic RTL by default.",
          rules: ["`locale` is `ar` or `en`."],
          body: { locale: "ar" },
          tests: T_OK,
          examples: [{ name: "Updated", body: { user: { ...SESSION.user, locale: "ar" } } }],
        }),
      ]
    ),
  ]
);

module.exports = { auth };
