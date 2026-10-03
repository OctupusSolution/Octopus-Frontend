// Where each social provider's credential comes from. The backend
// (POST /v1/auth/external/{provider}) wants the provider's own OIDC
// **id_token** as `credential` — not an OAuth code — audienced to the client
// id configured on the server (Identity:ExternalIdentity:GoogleClientId, ...).
//
// Only Google is wired to a real browser SDK: Google Identity Services, loaded
// from its script tag (no npm dependency) when VITE_GOOGLE_CLIENT_ID is set.
// GIS only hands out an id_token from its own rendered button (or One Tap), so
// the Google cell of the social row hosts that button rather than our own.
// Apple and Microsoft have no client-side config yet, so they stay disabled.
//
// VITE_EXTERNAL_SIGNIN_FAKE=true (dev builds only) instead mints the
// credential the backend's *Fake* provider accepts — "subject|email|name" —
// so the create/link flows can be exercised locally without any provider.
import type { ExternalProviderCode } from "@octopus/api-client";

const GIS_SRC = "https://accounts.google.com/gsi/client";

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null;

export const FAKE_EXTERNAL_SIGNIN =
  import.meta.env.DEV && (import.meta.env.VITE_EXTERNAL_SIGNIN_FAKE as string | undefined) === "true";

export type ProviderMode = "google-gis" | "fake" | "unavailable";

export function providerMode(provider: ExternalProviderCode): ProviderMode {
  if (FAKE_EXTERNAL_SIGNIN) return "fake";
  if (provider === "google" && GOOGLE_CLIENT_ID) return "google-gis";
  return "unavailable";
}

/** The dev-only Fake provider's credential: "subject|email|name". */
export function fakeCredential(provider: ExternalProviderCode, email: string): string {
  const normalized = email.trim().toLowerCase();
  return `dev-${provider}-${normalized}|${normalized}|${normalized.split("@")[0]}`;
}

// ---- Google Identity Services (minimal typing of what we use) -------------------

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
}

interface GoogleGlobal {
  accounts: { id: GoogleAccountsId };
}

declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

let gisLoading: Promise<GoogleAccountsId> | null = null;

/** Loads the GIS script once; rejects if it fails to load. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (gisLoading) return gisLoading;
  gisLoading = new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("Google Identity Services did not initialise"));
    };
    script.onerror = () => {
      gisLoading = null;
      script.remove();
      reject(new Error("Google Identity Services failed to load"));
    };
    document.head.appendChild(script);
  });
  return gisLoading;
}

/** Renders Google's own button into `host`; `onCredential` receives the id_token. */
export async function renderGoogleButton(
  host: HTMLElement,
  options: { width: number; locale: string; text: GoogleButtonOptions["text"] },
  onCredential: (idToken: string) => void
): Promise<void> {
  if (!GOOGLE_CLIENT_ID) throw new Error("VITE_GOOGLE_CLIENT_ID is not set");
  const id = await loadGoogleIdentity();
  id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => onCredential(response.credential),
    ux_mode: "popup",
    auto_select: false,
  });
  host.replaceChildren();
  id.renderButton(host, {
    type: "standard",
    theme: "outline",
    size: "large",
    shape: "rectangular",
    logo_alignment: "center",
    text: options.text,
    // GIS clamps width to 200–400px.
    width: Math.max(200, Math.min(400, Math.round(options.width))),
    locale: options.locale,
  });
}

/** The email claim of a provider id_token (read only to label the session —
 *  the backend is what verifies the token). */
export function emailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { email?: unknown };
    return typeof claims.email === "string" ? claims.email : null;
  } catch {
    return null;
  }
}
