// Mirrors PublicLinkContracts.cs / IConnectableContentProvider.cs exactly —
// see E:\Octupus\octopus-backend\src\Modules\PublicLink\...\Sites\PublicLinkContracts.cs
// (verified against the endpoint code, not the specs/ markdown, which had
// drifted for a related module — see FRONTEND_INTEGRATION_GAPS.md item 4.2).
//
// This is deliberately narrower than the merchant Public Link Builder's
// SiteDraft (theme, pages, navigation, multi-section content): the backend
// only supports a slug, four brand colours, a display name, a logo
// reference, publish status, and ONE connected content key. See
// PUBLIC_LINK_MISSING_ENDPOINTS.md for the gap — do not add fields here that
// the backend does not actually accept; a request with extra JSON keys is
// harmless, but a type that claims support for something like multi-section
// content would be a lie.

export type PublicSiteStatus = "Draft" | "Live";

export interface BrandColors {
  primary: string | null;
  light: string | null;
  accent: string | null;
  dark: string | null;
}

export interface PublicSiteResponse {
  businessId: string;
  slug: string | null;
  publicHostname: string | null;
  publicUrl: string | null;
  status: PublicSiteStatus;
  displayName: string | null;
  colors: BrandColors;
  logoReference: string | null;
  lastPublishedAtUtc: string | null;
  slugChangeAllowedAtUtc: string | null;
  connectedContentKey: string | null;
}

export interface ClaimSlugRequest {
  slug: string;
}

export interface UpdateBrandRequest {
  displayName?: string | null;
  primaryColor?: string | null;
  lightColor?: string | null;
  accentColor?: string | null;
  darkColor?: string | null;
  logoReference?: string | null;
}

export interface SlugAvailabilityResponse {
  slug: string;
  isAvailable: boolean;
  reason: string | null;
}

export interface ConnectContentRequest {
  contentKey: string;
}

export interface ConnectableContentSummary {
  contentKey: string;
  displayName: string;
  updatedAtUtc: string;
  entryCount: number;
}
