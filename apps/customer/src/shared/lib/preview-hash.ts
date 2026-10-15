// The backend's own preview link is `https://<site host>/preview#t=<token>`
// (PublicLink:Preview:PageUrlTemplate). The token rides in the fragment, which the browser never
// sends to a server, so `/preview` reads it on the client and hands it to the storefront's preview
// entry (`/_preview?token=…`), which keeps it in an httpOnly cookie as for the builder's links.
import { PREVIEW_ENTER_PATH } from "./preview";

/** The preview entry for a `#t=<token>` fragment, or null when there is no token. Parsed by hand:
 *  URLSearchParams would read a `+` in the token as a space. */
export function previewEntryFromHash(hash: string): string | null {
  for (const part of hash.replace(/^#/, "").split("&")) {
    if (!part.startsWith("t=")) continue;
    let token: string;
    try {
      token = decodeURIComponent(part.slice(2));
    } catch {
      token = part.slice(2);
    }
    return token ? `${PREVIEW_ENTER_PATH}?token=${encodeURIComponent(token)}` : null;
  }
  return null;
}
