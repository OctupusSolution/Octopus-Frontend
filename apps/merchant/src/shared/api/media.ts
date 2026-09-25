// Uploading a picked image to the business's media library.
//
// The API signs a direct-to-Cloudinary upload (`requestMediaUpload`), the browser
// posts the file, and `completeMediaUpload` turns it into an asset the API
// stores by id. Everywhere else the app keeps images as URLs, so `resolve`
// hands back the asset's delivery URL alongside its reference.
//
// `VITE_MEDIA_UPLOAD_SHIM` (local dev only) sends the file through a local
// re-signer instead of straight to Cloudinary; leave it unset for the real thing.
import {
  completeMediaUpload,
  completeSiteMediaUpload,
  getMediaAsset,
  getSiteMediaAsset,
  requestMediaUpload,
  requestSiteMediaUpload,
  type MediaAssetResponse,
  type MediaReferenceDto,
} from "@octopus/api-client";

export type MediaPurpose = "SectionImage" | "ItemImage" | "OfferImage" | "ThemeLogo" | "ThemeHeroImage";
/** The Public Link module has its own library and its own purposes. */
export type SiteMediaPurpose = "Logo" | "Favicon" | "HeroBackground" | "SectionImage";

export interface UploadedMedia {
  ref: MediaReferenceDto;
  url: string;
}

/** Assets already known in this session, by delivery URL and by id. */
const byUrl = new Map<string, MediaReferenceDto>();
const byId = new Map<string, string>();
/** Picked files already uploaded, so two saves in a row send one upload. */
const uploaded = new Map<string, Promise<UploadedMedia>>();

const remember = (asset: Pick<MediaAssetResponse, "assetId" | "kind" | "deliveryUrl">): UploadedMedia => {
  const ref = { assetId: asset.assetId, kind: asset.kind };
  byUrl.set(asset.deliveryUrl, ref);
  byId.set(asset.assetId, asset.deliveryUrl);
  return { ref, url: asset.deliveryUrl };
};

/** A picked image is a data:/blob: URL until it has been uploaded. */
export const isLocalMedia = (src: string | null | undefined): src is string =>
  Boolean(src && (src.startsWith("data:") || src.startsWith("blob:")));

/** The reference for an image URL the API has already given us, else null. */
export const knownMedia = (src: string | null | undefined): MediaReferenceDto | null =>
  (src && byUrl.get(src)) || null;

export function uploadMedia(businessId: string, src: string, purpose: MediaPurpose | SiteMediaPurpose, fileName = "image", library: "menu" | "site" = "menu"): Promise<UploadedMedia> {
  const cacheKey = `${library}:${purpose}:${src}`;
  let job = uploaded.get(cacheKey);
  if (!job) {
    job = doUpload(businessId, src, purpose, fileName, library).catch((err) => {
      uploaded.delete(cacheKey);
      throw err;
    });
    uploaded.set(cacheKey, job);
  }
  return job;
}

async function doUpload(businessId: string, src: string, purpose: string, fileName: string, library: "menu" | "site"): Promise<UploadedMedia> {
  const blob = await (await fetch(src)).blob();
  const request = { purpose, fileName, contentType: blob.type || "image/jpeg", bytes: blob.size };
  const ticket =
    library === "site"
      ? await requestSiteMediaUpload(businessId, request as never)
      : await requestMediaUpload(businessId, { businessId, ...request });
  const type = ticket.resourceType.toLowerCase();
  const form = new FormData();
  form.set("file", blob, fileName);
  form.set("api_key", ticket.apiKey);
  form.set("timestamp", String(ticket.timestamp));
  form.set("signature", ticket.signature);
  form.set("folder", ticket.folder);
  form.set("public_id", ticket.publicId);
  form.set("allowed_formats", ticket.allowedFormats.join(","));

  const shim = import.meta.env.VITE_MEDIA_UPLOAD_SHIM as string | undefined;
  const target = shim ? `${shim}/upload/${type}` : `https://api.cloudinary.com/v1_1/${ticket.cloudName}/${type}/upload`;
  let res: Response;
  try {
    res = await fetch(target, { method: "POST", body: form });
  } catch {
    throw new Error(`Image upload failed: could not reach ${shim ? `the local upload shim (${shim})` : "Cloudinary"}.`);
  }
  if (!res.ok) throw new Error(`Image upload failed (${res.status})`);
  return remember(
    library === "site"
      ? await completeSiteMediaUpload(businessId, ticket.uploadId)
      : await completeMediaUpload(businessId, ticket.uploadId, { businessId })
  );
}

/** The delivery URL for a stored reference (one call per new asset). */
export async function mediaUrl(
  businessId: string,
  ref: { assetId: string; kind: string } | null | undefined,
  library: "menu" | "site" = "menu"
): Promise<string | null> {
  if (!ref) return null;
  const hit = byId.get(ref.assetId);
  if (hit) return hit;
  return remember(library === "site" ? await getSiteMediaAsset(businessId, ref.assetId) : await getMediaAsset(businessId, ref.assetId)).url;
}
