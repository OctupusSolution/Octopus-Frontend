// Picking a menu document: a PDF or a photo of a printed menu.
//
// A sibling of use-file-picker rather than an option on it. That hook is for
// media that ends up ON the menu, sized for being held as a data URL; this one
// is for a source document that is read once and thrown away, so its limits
// (20 MB, PDF allowed) and what it hands back (the File's facts, not its bytes)
// are different enough that one hook with a mode switch would serve neither.
//
// Photos still come back with a data URL, because the upload card shows the
// merchant the picture they chose — a thumbnail is how they confirm it was the
// right one. PDFs do not: rendering a PDF page needs a library this app does
// not carry, so the card draws a document icon instead.

import { useCallback, useRef, useState, type DragEvent, type ReactElement } from "react";

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

export type DocumentError = "too-large" | "wrong-type" | "unreadable";

export interface PickedDocument {
  name: string;
  size: number;
  type: (typeof DOCUMENT_TYPES)[number];
  /** Set for images only. */
  previewUrl: string | null;
}

/** Pure, so the rule is testable and the drop zone and the dialog agree. */
export function validateDocument(file: { size: number; type: string }): DocumentError | null {
  if (!(DOCUMENT_TYPES as readonly string[]).includes(file.type)) return "wrong-type";
  if (file.size > DOCUMENT_MAX_BYTES) return "too-large";
  return null;
}

export interface DocumentPicker {
  open: () => void;
  /** Render once, anywhere inside the component. Hidden. */
  input: ReactElement;
  /** Spread onto the element that should accept a dropped file. */
  dropProps: {
    onDragOver: (event: DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (event: DragEvent) => void;
  };
  dragging: boolean;
  error: DocumentError | null;
}

export function useDocumentPicker(onPick: (doc: PickedDocument) => void): DocumentPicker {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<DocumentError | null>(null);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const problem = validateDocument(file);
      if (problem) {
        setError(problem);
        return;
      }
      setError(null);
      const facts = { name: file.name, size: file.size, type: file.type as PickedDocument["type"] };
      if (file.type === "application/pdf") {
        onPick({ ...facts, previewUrl: null });
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? onPick({ ...facts, previewUrl: reader.result })
          : setError("unreadable");
      reader.onerror = () => setError("unreadable");
      reader.readAsDataURL(file);
    },
    [onPick]
  );

  const open = useCallback(() => ref.current?.click(), []);

  const input = (
    <input
      ref={ref}
      type="file"
      accept={DOCUMENT_TYPES.join(",")}
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        // Cleared so choosing the same file again still fires.
        event.target.value = "";
        accept(file);
      }}
    />
  );

  return {
    open,
    input,
    dragging,
    error,
    dropProps: {
      onDragOver: (event) => {
        event.preventDefault();
        setDragging(true);
      },
      onDragLeave: () => setDragging(false),
      onDrop: (event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files?.[0]);
      },
    },
  };
}
