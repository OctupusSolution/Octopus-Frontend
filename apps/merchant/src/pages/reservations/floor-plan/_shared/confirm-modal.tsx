import type { ReactNode } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { Button, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export interface ConfirmAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
}

const TONE_CLASSES = {
  info: "bg-[#0D6EFD]/10 text-[#0D6EFD]",
  warning: "bg-[#F59E0B]/12 text-[#D97706]",
  danger: "bg-[#EF4444]/10 text-[#DC2626]",
  success: "bg-[#22C55E]/12 text-[#16A34A]",
} as const;

export function ConfirmModal({
  open,
  onClose,
  icon,
  tone = "info",
  title,
  body,
  actions,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  icon?: ReactNode;
  tone?: keyof typeof TONE_CLASSES;
  title: string;
  body?: ReactNode;
  actions: ConfirmAction[];
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} className={clsx("max-w-md p-6", className)}>
      <div className="flex items-start gap-3.5">
        {icon && <span className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-full", TONE_CLASSES[tone])}>{icon}</span>}
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{title}</h2>
          {body && <div className="mt-1.5 text-[13px] leading-relaxed text-[var(--octo-text-secondary)]">{body}</div>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("floorPlan.common.close")}
          className="-me-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
        >
          <X size={16} />
        </button>
      </div>
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? "primary"}
            icon={action.icon}
            onClick={action.onClick}
            className="h-10 justify-center px-4 text-[13px]"
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Modal>
  );
}
