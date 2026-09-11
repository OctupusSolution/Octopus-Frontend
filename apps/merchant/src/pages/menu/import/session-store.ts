// The import's one session: which file, how far the reader has got, and the
// detection the merchant is editing.
//
// Module-level plus useSyncExternalStore, the same shape as use-menu-library,
// and for the same reason: the three screens are three renders of one route
// (`?step=`), and the processing clock has to keep running while the merchant
// looks at a different one. State held in a component would reset the moment
// the step changed.
//
// The clock is a start timestamp, not a counter. Every tick recomputes elapsed
// time from it, so a throttled background tab catches up instead of lagging.

import { useSyncExternalStore } from "react";
import type { DetectionResult } from "@/entities/menu/ai-import";
import { PROCESSING_MS, UPLOAD_MS, mockDetection } from "@/entities/menu/ai-import-mock";
import type { PickedDocument } from "@/shared/ui/use-document-picker";

export type ImportPhase = "idle" | "uploading" | "processing" | "done";

export interface ImportSession {
  file: PickedDocument | null;
  phase: ImportPhase;
  /** Milliseconds into processing (upload excluded), already scaled. */
  processingMs: number;
  /** 0–100 while uploading. */
  uploadPercent: number;
  /** What the reader will return; the screens only read it once `phase` is
   *  "done", and progress reveals it gradually before that. */
  result: DetectionResult | null;
}

const IDLE: ImportSession = { file: null, phase: "idle", processingMs: 0, uploadPercent: 0, result: null };

let session: ImportSession = IDLE;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function emit(next: ImportSession) {
  session = next;
  for (const listener of listeners) listener();
}

function stop() {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

/** Merchants who asked the OS for less motion get the whole thing in well
 *  under a second — the same states, just not a performance. */
function speed(): number {
  if (typeof window === "undefined" || !window.matchMedia) return 1;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 12 : 1;
}

export function startImport(file: PickedDocument) {
  stop();
  const startedAt = Date.now();
  const scale = speed();
  const result = mockDetection(file.name);
  emit({ file, phase: "uploading", processingMs: 0, uploadPercent: 0, result });

  timer = setInterval(() => {
    const elapsed = (Date.now() - startedAt) * scale;
    if (elapsed < UPLOAD_MS) {
      emit({ ...session, uploadPercent: Math.round((elapsed / UPLOAD_MS) * 100) });
      return;
    }
    const processingMs = Math.min(PROCESSING_MS, elapsed - UPLOAD_MS);
    const done = processingMs >= PROCESSING_MS;
    emit({ ...session, phase: done ? "done" : "processing", uploadPercent: 100, processingMs });
    if (done) stop();
  }, 80);
}

export function resetImport() {
  stop();
  emit(IDLE);
}

/** Edits only apply to a finished detection; before that there is nothing the
 *  merchant has seen to edit. */
export function updateResult(fn: (result: DetectionResult) => DetectionResult) {
  if (session.phase !== "done" || !session.result) return;
  emit({ ...session, result: fn(session.result) });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => session;

export function useImportSession(): ImportSession {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** A short unique id for anything the merchant adds during the session. */
let counter = 0;
export function sessionId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
