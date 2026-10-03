import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import clsx from "clsx";

export interface ToastMessage {
  id: number;
  text: string;
  tone: "success" | "error" | "info";
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const notify = useCallback(
    (text: string, tone: ToastMessage["tone"] = "success") => setToast({ id: Date.now(), text, tone }),
    []
  );
  return { toast, notify };
}

export function ToastBanner({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;
  const Icon = toast.tone === "success" ? CircleCheck : toast.tone === "error" ? CircleAlert : Info;
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={clsx(
        "fixed bottom-5 end-5 z-[70] flex max-w-[calc(100vw-40px)] items-center gap-2 rounded-[10px] border bg-[var(--octo-card)] px-4 py-2.5 text-[13px] font-medium shadow-lg",
        toast.tone === "success" && "border-[#22C55E]/25 text-[var(--octo-tone-success-text)]",
        toast.tone === "error" && "border-[#EF4444]/25 text-[var(--octo-tone-danger-text)]",
        toast.tone === "info" && "border-[#0D6EFD]/25 text-[var(--octo-tone-info-text)]"
      )}
    >
      <Icon size={16} className="shrink-0" />
      {toast.text}
    </div>
  );
}
