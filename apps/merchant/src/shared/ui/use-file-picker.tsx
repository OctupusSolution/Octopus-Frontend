// Picking an image or a video, without a backend to put it in.
//
// The file is read into a data URL and handed to the caller, which stores it on
// the draft like any other field. That is enough for everything the wizard
// promises today — the merchant picks a photo and sees it in the live preview
// and on the card — and it is the same string a real upload would hand back, so
// swapping FileReader for a POST later changes this file and nothing else.
//
// Data URLs are not free: a 3MB photo becomes ~4MB of base64 held in memory for
// as long as the draft lives. MAX_BYTES keeps that honest by refusing anything
// large rather than quietly making the page crawl.

import { useCallback, useRef, useState, type ReactElement } from "react";

/** Comfortably above a 600×400 menu photo, well below the point where holding
 *  several in memory hurts. */
const MAX_BYTES = 4 * 1024 * 1024;

export interface FilePicker {
  /** Opens the OS file dialog. */
  open: () => void;
  /** Render this once, anywhere inside the component. It is visually hidden. */
  input: ReactElement;
  /** Set when the last pick was refused, so the caller can say why. */
  error: "too-large" | "unreadable" | null;
}

export function useFilePicker(
  onPick: (dataUrl: string) => void,
  accept: "image" | "video" = "image"
): FilePicker {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<FilePicker["error"]>(null);

  const open = useCallback(() => {
    setError(null);
    ref.current?.click();
  }, []);

  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept === "image" ? "image/*" : "video/*"}
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        // Always clear, so picking the same file twice in a row still fires.
        event.target.value = "";
        if (!file) return;
        if (file.size > MAX_BYTES) {
          setError("too-large");
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
