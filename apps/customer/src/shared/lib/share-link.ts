/** Hands a link to the device's share sheet, or to the clipboard where there is
 *  none (or it has no target to offer, as on many desktops). Resolves to whether
 *  the link actually went somewhere — a dismissed share sheet is a "no". */
export async function shareLink(url: string, title?: string): Promise<boolean> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ url, title });
      return true;
    } catch (error) {
      // The customer closed the sheet: they chose not to share.
      if (error instanceof DOMException && error.name === "AbortError") return false;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
