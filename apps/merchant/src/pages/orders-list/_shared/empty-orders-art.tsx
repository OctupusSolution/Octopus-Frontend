// apps/merchant/src/pages/orders-list/_shared/empty-orders-art.tsx
import { ShellIcon } from "@/shared/ui/shell-icon";

/** The "No Orders Yet!" artwork from the Orders frame (a struck-through order
 *  bubble over an empty tray). The frame paints it as a mask, so it takes the
 *  text colour. */
export function EmptyOrdersArt({ size = 200, className }: { size?: number; className?: string }) {
  return <ShellIcon name="ord-empty.png" size={size} className={className} />;
}
