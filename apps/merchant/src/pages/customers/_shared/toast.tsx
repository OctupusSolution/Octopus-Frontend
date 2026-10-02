// apps/merchant/src/pages/customers/_shared/toast.tsx
import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

export const TOAST_DURATION_MS = 3500;

export type ToastTone = "success" | "error";

/** One transient confirmation message that clears itself after
 *  `TOAST_DURATION_MS`; showing a new one restarts the timer. */
export function useToast(): [string | null, (message: string, tone?: ToastTone) => void, ToastTone] {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone; id: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const show = useCallback((message: string, tone: ToastTone = "success") => setToast({ message, tone, id: Date.now() }), []);
  return [toast?.message ?? null, show, toast?.tone ?? "success"];
}

/** Floating confirmation pinned to the bottom of the viewport so it never
 *  pushes the page layout around (the frames reserve no slot for it). */
export function Toast({ message, tone = "success" }: { message: string | null; tone?: ToastTone }) {
  if (!message) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`fixed bottom-6 start-1/2 z-[60] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg rtl:translate-x-1/2 ${tone === "error" ? "bg-[#DC2626]" : "bg-[#16A34A]"}`}
    >
      {tone === "error" ? <CircleAlert size={16} /> : <CircleCheck size={16} />}
      {message}
    </div>
  );
}
