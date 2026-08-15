import { Card, CardBody } from "@ui/primitives";
import type { OrderLine } from "@octopus/api-client";
import { RemoveItemControls } from "@/features/cart/remove-item";
import { computeLineTotalSar, formatSar } from "@/shared/lib/pricing";

export interface CartSummaryProps {
  lines: OrderLine[];
  subtotalSar: number;
  discountSar: number;
  totalSar: number;
  onQuantityChange: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
}

export function CartSummary({ lines, subtotalSar, discountSar, totalSar, onQuantityChange, onRemove }: CartSummaryProps) {
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => (
        <Card key={line.lineId}>
          <CardBody className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{line.name}</p>
                {line.modifiers.length > 0 && (
                  <p className="text-[11px] text-[var(--octo-text-muted)]">
                    {line.modifiers.map((modifier) => modifier.label).join("، ")}
                  </p>
                )}
                {line.notes && <p className="text-[11px] italic text-[var(--octo-text-muted)]">{line.notes}</p>}
              </div>
              <span className="shrink-0 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                {formatSar(computeLineTotalSar(line))}
              </span>
            </div>
            <RemoveItemControls
              quantity={line.quantity}
              onQuantityChange={(quantity) => onQuantityChange(line.lineId, quantity)}
              onRemove={() => onRemove(line.lineId)}
            />
          </CardBody>
        </Card>
      ))}

      <Card>
        <CardBody className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between text-[12.5px] text-[var(--octo-text-secondary)]">
            <span>المجموع الفرعي</span>
            <span>{formatSar(subtotalSar)}</span>
          </div>
          {discountSar > 0 && (
            <div className="flex items-center justify-between text-[12.5px] font-medium text-[#22C55E]">
              <span>الخصم</span>
              <span>-{formatSar(discountSar)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[var(--octo-divider)] pt-2 text-[15px] font-bold text-[var(--octo-text-primary)]">
            <span>الإجمالي</span>
            <span>{formatSar(totalSar)}</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
