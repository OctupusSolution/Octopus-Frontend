// Picking an image or a video, without a backend to put it in.
//
// An image is read into a data URL and handed to the caller, which stores it on
// the draft like any other field. That is enough for everything the wizard
// promises today — the merchant picks a photo and sees it in the live preview
// and on the card — and it is the same string a real upload would hand back, so
// swapping FileReader for a POST later changes this file and nothing else.
//
// Data URLs are not free: a 3MB photo becomes ~4MB of base64 held in memory for
// as long as the draft lives. The per-kind limit keeps that honest by refusing
// anything large rather than quietly making the page crawl.
//
// Video is different: the frame promises 100MB, and base64-encoding that would
// stall the tab. A video becomes an object URL instead — a pointer to the file
// the browser already holds. It only lives as long as this page, which is fine
// for a draft that lives in memory too.

import { useCallback, useRef, useState, type ReactElement } from "react";

const MB = 1024 * 1024;

/** Image: comfortably above a 600×400 menu photo, well below the point where
 *  holding several data URLs in memory hurts. Video: what the hint promises. */
const MAX_BYTES = { image: 4 * MB, video: 100 * MB } as const;

const ACCEPT = { image: "image/*", video: "video/mp4,video/quicktime" } as const;

export interface FilePicker {
  /** Opens the OS file dialog. */
  open: () => void;
  /** Render this once, anywhere inside the component. It is visually hidden. */
  input: ReactElement;
  /** Set when the last pick was refused, so the caller can say why. */
  error: "too-large" | "unreadable" | null;
}

export function useFilePicker(
  onPick: (url: string) => void,
  accept: "image" | "video" = "image"
): FilePicker {
  const ref = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const [error, setError] = useState<FilePicker["error"]>(null);

  const open = useCallback(() => {
    setError(null);
    ref.current?.click();
  }, []);

  const input = (
    <input
      ref={ref}
      type="file"
      accept={ACCEPT[accept]}
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        // Always clear, so picking the same file twice in a row still fires.
        event.target.value = "";
        if (!file) return;
        if (file.size > MAX_BYTES[accept]) {
          setError("too-large");
          return;
        }
        setError(null);

        if (accept === "video") {
          // Revoked on replace only. Not on unmount: the draft still points at
          // the URL after this tab closes, and the preview would go blank.
          if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
          objectUrl.current = URL.createObjectURL(file);
          onPick(objectUrl.current);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") onPick(result);
          else setError("unreadable");
        };
        reader.onerror = () => setError("unreadable");
        reader.readAsDataURL(file);
      }}
    />
  );

  return { open, input, error };
}
