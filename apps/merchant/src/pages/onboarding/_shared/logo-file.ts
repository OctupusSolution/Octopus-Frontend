// Turning a picked file into the logo data URL the draft carries.
//
// Lifted out of step 4 when step 8 grew a Logo control of its own: two screens
// reading the same file into the same field must agree on the size cap, or one
// of them silently reintroduces the quota problem the cap exists to avoid.

/** Longest edge, in pixels, the stored logo is downscaled to. */
const MAX_EDGE = 512;

/** Reads `file` to a downscaled PNG data URL and hands it to `onLoad`.
 *
 *  There is no upload endpoint — the logo only ever needs to render inside this
 *  wizard — so the image is kept inline. The whole draft (this data URL
 *  included) gets JSON.stringify'd into sessionStorage on every change, so an
 *  unbounded photo can blow the storage quota and silently break the
 *  resume-after-refresh guarantee. Downscaling to at most `MAX_EDGE` on the
 *  longest edge — more than any surface here actually renders — is preferred to
 *  rejecting the file outright, since there is no i18n key to explain a
 *  rejection to the merchant.
 *
 *  Every failure path is silent by the same reasoning: `onLoad` simply never
 *  fires, so `logoDataUrl` keeps whatever it had rather than being set to a
 *  broken value. */
export function readLogoFile(file: File | undefined, onLoad: (dataUrl: string) => void): void {
  if (!file) return;

  const reader = new FileReader();
  reader.onerror = () => {
    // Unreadable file — leave logoDataUrl as it was.
  };
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => {
      // Failed to decode — leave logoDataUrl as it was.
    };
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      onLoad(canvas.toDataURL("image/png"));
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}
