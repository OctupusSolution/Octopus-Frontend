// apps/merchant/src/pages/customers/_shared/empty-illustration.tsx
import { ShellIcon } from "@/shared/ui/shell-icon";

/** The empty-state artwork from the CRM frame (stars over three people on an
 *  open hand). The frame paints it as a mask, so it takes the text colour. */
export function EmptyCustomersIllustration({ className }: { className?: string }) {
  return <ShellIcon name="crm-empty-customers.png" size={200} className={className} />;
}
