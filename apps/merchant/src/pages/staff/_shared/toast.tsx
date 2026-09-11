import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import clsx from "clsx";

export interface ToastMessage {
  text: string;
  tone: "success" | "error";
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const notify = useCallback((text: string, tone: ToastMessage["tone"] = "success") => setToast({ text, tone }), []);
  return { toast, notify };
}

export function ToastBanner({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;
  const success = toast.tone === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "fixed bottom-5 end-5 z-[60] flex max-w-[calc(100vw-40px)] items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13px] font-medium shadow-lg",
        success
          ? "border-[#22C55E]/25 bg-[var(--octo-card)] text-[var(--octo-tone-success-text)]"
          : "border-[#EF4444]/25 bg-[var(--octo-card)] text-[var(--octo-tone-danger-text)]"
      )}
    >
      {success ? <CircleCheck size={16} className="shrink-0" /> : <CircleAlert size={16} className="shrink-0" />}
      {toast.text}
    </div>
  );
}
