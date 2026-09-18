// apps/merchant/src/pages/customers/_shared/toast.tsx
import { useCallback, useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";

export const TOAST_DURATION_MS = 3500;

/** One transient confirmation message that clears itself after
 *  `TOAST_DURATION_MS`; showing a new one restarts the timer. */
export function useToast(): [string | null, (message: string) => void] {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const show = useCallback((message: string) => setToast({ message, id: Date.now() }), []);
  return [toast?.message ?? null, show];
}

/** Floating confirmation pinned to the bottom of the viewport so it never
 *  pushes the page layout around (the frames reserve no slot for it). */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 start-1/2 z-[60] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-[10px] bg-[#16A34A] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg rtl:translate-x-1/2"
    >
      <CircleCheck size={16} />
      {message}
    </div>
  );
}
