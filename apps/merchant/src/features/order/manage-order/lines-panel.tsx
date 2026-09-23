// The lines of a real order and everything that can be done to them:
// advance status, edit / remove an unstarted line, line discounts, cancel or
// void selected lines, and adding more lines from the order's own catalog.
import { useMemo, useState } from "react";
import { ChevronRight, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import {
  addOrderLines,
  advanceLineStatus,
  applyLineDiscount,
  cancelOrderLines,
  removeLineDiscount,
  removeOrderLine,
  updateOrderLine,
  voidOrderLines,
  type OrderLineResponse,
  type OrderResponse,
} from "@octopus/api-client";
import {
  addDraftLine,
  canDiscount,
  canEditLine,
  CatalogItemPicker,
  DraftCart,
  formatMoney,
  isLineInWork,
  isLineLive,
  isOrderOpen,
  LineStatusPill,
  nextLineStatus,
  OrderButton,
  OrderSection,
  orderInputClass,
  reasonCodesFor,
  toOrderLineRequests,
  useOrderText,
  useSellableCatalog,
  type DraftLine,
  type OrderTextKey,
  type OrderWorkspace,
} from "@/entities/order";
import type { OrderSettingsResponse } from "@octopus/api-client";
import { DiscountForm, ReversalForm } from "./action-forms";

type LinePanel = { lineId: string; mode: "edit" | "discount" } | null;

function LineEditor({
  line,
  busy,
  onSave,
  onCancel,
}: {
  line: OrderLineResponse;
  busy: boolean;
  onSave: (quantity: number, note: string | null) => void;
  onCancel: () => void;
}) {
  const { tx } = useOrderText();
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [note, setNote] = useState(line.note ?? "");
  const qty = Math.floor(Number(quantity));
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-[10px] bg-[var(--octo-hover)] p-3">
      <label className="flex w-[90px] flex-col gap-1 text-[12px] text-[var(--octo-text-secondary)]">
        {tx("lines.quantity")}
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className={orderInputClass}
        />
      </label>
      <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[12px] text-[var(--octo-text-secondary)]">
        {tx("picker.note")}
        <input value={note} onChange={(event) => setNote(event.target.value)} className={orderInputClass} />
      </label>
      <OrderButton onClick={onCancel}>{tx("common.cancel")}</OrderButton>
      <OrderButton tone="primary" disabled={busy || !(qty >= 1)} onClick={() => onSave(qty, note.trim() || null)}>
        {tx("common.save")}
      </OrderButton>
    </div>
  );
}

function AddItemsPanel({
  order,
  ws,
  onDone,
}: {
  order: OrderResponse;
  ws: OrderWorkspace;
  onDone: () => void;
}) {
  const { tx } = useOrderText();
  const catalogId = order.lines[0]?.catalog.catalogId ?? null;
  const catalog = useSellableCatalog(catalogId, order.sourceCode);
  const [lines, setLines] = useState<DraftLine[]>([]);
  // Idempotent write: one key per exact set of lines, so a retry replays and
  // an edited cart gets a fresh key.
  const linesJson = JSON.stringify(toOrderLineRequests(lines));
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [linesJson]);

  if (!catalogId) return <p className="text-[12.5px] text-[var(--octo-text-muted)]">{tx("lines.noCatalog")}</p>;
  if (catalog.error) return <p className="text-[12.5px] text-[#DC2626]">{catalog.error}</p>;
  if (!catalog.data) return <p className="text-[12.5px] text-[var(--octo-text-muted)]">{tx("common.loading")}</p>;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-[#0D6EFD]/30 p-3 lg:grid-cols-[1fr_240px]">
      <CatalogItemPicker
        catalog={catalog.data}
        fulfilmentCode={order.fulfilmentCode}
        onAdd={(line) => setLines((prev) => addDraftLine(prev, line))}
      />
      <div>
        <DraftCart lines={lines} currency={catalog.data.currency} onChange={setLines} />
        <div className="mt-3 flex gap-2">
          <OrderButton className="flex-1" onClick={onDone}>
            {tx("common.cancel")}
          </OrderButton>
          <OrderButton
            tone="primary"
            className="flex-1"
            disabled={lines.length === 0 || ws.busy !== null}
            onClick={() =>
              void ws
                .run("addLines", (ctx) =>
                  addOrderLines(
                    ctx.businessId,
                    ctx.orderId,
                    {
                      businessId: ctx.businessId,
                      orderId: ctx.orderId,
                      lines: toOrderLineRequests(lines),
                      expectedVersion: ctx.version,
                    },
                    idempotencyKey
                  )
                )
                .then((ok) => ok && onDone())
            }
          >
            {tx("lines.addToOrder")}
          </OrderButton>
        </div>
      </div>
    </div>
  );
}

export function LinesPanel({
  ws,
  order,
  settings,
}: {
  ws: OrderWorkspace;
  order: OrderResponse;
  settings: OrderSettingsResponse | null;
}) {
  const { tx } = useOrderText();
  const [selected, setSelected] = useState<string[]>([]);
  const [panel, setPanel] = useState<LinePanel>(null);
  const [reversal, setReversal] = useState<"cancel" | "void" | null>(null);
  const [adding, setAdding] = useState(false);
  const open = isOrderOpen(order.status);
  const busy = ws.busy !== null;
  const approvalNeeded = ws.actionError?.approvalNeeded ?? false;
  const liveCount = order.lines.filter((line) => isLineLive(line.status)).length;
  const selectedLines = order.lines.filter((line) => selected.includes(line.id));
  const canCancelSelected = selectedLines.length > 0 && selectedLines.every((line) => line.status === "Pending");
  const canVoidSelected = selectedLines.length > 0 && selectedLines.every((line) => isLineLive(line.status));
  const discountable = canDiscount(order);

  function toggle(lineId: string) {
    setSelected((prev) => (prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]));
  }

  return (
    <OrderSection
      title={tx("lines.title").replace("{n}", String(order.lines.length))}
      aside={
        open && (
          <OrderButton icon={<Plus size={13} />} onClick={() => setAdding((value) => !value)}>
            {tx("lines.addItems")}
          </OrderButton>
        )
      }
    >
      {adding && <AddItemsPanel order={order} ws={ws} onDone={() => setAdding(false)} />}

      <ul className="flex flex-col divide-y divide-[var(--octo-divider)]">
        {order.lines.map((line) => {
          const next = order.status !== "New" && open ? nextLineStatus(line.status) : null;
          const editable = canEditLine(order, line);
          return (
            <li key={line.id} className="py-2.5">
              <div className="flex items-start gap-3">
                {open && isLineLive(line.status) ? (
                  <input
                    type="checkbox"
                    className="mt-1"
                    aria-label={line.displayName}
                    checked={selected.includes(line.id)}
                    onChange={() => toggle(line.id)}
                  />
                ) : (
                  <span className="w-[13px]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
                      {line.quantity}× {line.displayName}
                    </span>
                    <LineStatusPill status={line.status} />
                    {line.wastedQuantity > 0 && (
                      <span className="text-[11px] text-[#7C3AED]">
                        {tx("lines.wasted").replace("{n}", String(line.wastedQuantity))}
                      </span>
                    )}
                  </div>
                  {line.options.length > 0 && (
                    <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                      {line.options.map((option) => option.optionName).join("، ")}
                    </p>
                  )}
                  {line.note && <p className="text-[11.5px] text-[#D97706]">{line.note}</p>}
                  {line.discount && (
                    <p className="text-[11.5px] text-[#16A34A]">
                      {tx("discount.applied")
                        .replace("{value}", line.discount.kind === "Percent" ? `${line.discount.value}%` : formatMoney(line.discount.amount))
                        .replace("{amount}", formatMoney(line.discount.amount))}
                    </p>
                  )}
                  {line.termination && (
                    <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                      {line.termination.kind} · {line.termination.reasonCode}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[13px] font-semibold text-[var(--octo-text-primary)]">
                  {formatMoney(line.lineTotal)}
                </span>
              </div>

              <div className="ms-6 mt-1.5 flex flex-wrap gap-1.5">
                {next && (
                  <OrderButton
                    tone="primary"
                    disabled={busy}
                    icon={<ChevronRight size={13} />}
                    onClick={() =>
                      void ws.run("advanceLine", (ctx) =>
                        advanceLineStatus(ctx.businessId, ctx.orderId, line.id, { status: next, expectedVersion: ctx.version })
                      )
                    }
                  >
                    {tx(`lineStatus.to.${next}` as OrderTextKey)}
                  </OrderButton>
                )}
                {editable && (
                  <OrderButton
                    icon={<Pencil size={12} />}
                    onClick={() => setPanel(panel?.lineId === line.id && panel.mode === "edit" ? null : { lineId: line.id, mode: "edit" })}
                  >
                    {tx("common.edit")}
                  </OrderButton>
                )}
                {editable && liveCount > 1 && (
                  <OrderButton
                    tone="danger"
                    disabled={busy}
                    icon={<Trash2 size={12} />}
                    onClick={() =>
                      void ws.run("removeLine", (ctx) =>
                        removeOrderLine(ctx.businessId, ctx.orderId, line.id, { expectedVersion: ctx.version })
                      )
                    }
                  >
                    {tx("lines.remove")}
                  </OrderButton>
                )}
                {discountable && isLineLive(line.status) && !line.discount && (
                  <OrderButton
                    tone="success"
                    icon={<Percent size={12} />}
                    onClick={() =>
                      setPanel(panel?.lineId === line.id && panel.mode === "discount" ? null : { lineId: line.id, mode: "discount" })
                    }
                  >
                    {tx("discount.add")}
                  </OrderButton>
                )}
                {discountable && line.discount && (
                  <OrderButton
                    disabled={busy}
                    onClick={() =>
                      void ws.run("removeLineDiscount", (ctx) =>
                        removeLineDiscount(ctx.businessId, ctx.orderId, line.id, { expectedVersion: ctx.version })
                      )
                    }
                  >
                    {tx("discount.remove")}
                  </OrderButton>
                )}
              </div>

              {panel?.lineId === line.id && panel.mode === "edit" && (
                <LineEditor
                  line={line}
                  busy={busy}
                  onCancel={() => setPanel(null)}
                  onSave={(quantity, note) =>
                    void ws
                      .run("updateLine", (ctx) =>
                        updateOrderLine(ctx.businessId, ctx.orderId, line.id, {
                          quantity,
                          // The FULL selection — null would strip the options.
                          optionIds: line.options.map((option) => option.optionId),
                          note,
                          expectedVersion: ctx.version,
                        })
                      )
                      .then((ok) => ok && setPanel(null))
                  }
                />
              )}
              {panel?.lineId === line.id && panel.mode === "discount" && (
                <DiscountForm
                  reasonCodes={reasonCodesFor(settings, "discount")}
                  accountId={ws.accountId}
                  currency={order.currency}
                  busy={busy}
                  approvalNeeded={approvalNeeded}
                  onCancel={() => setPanel(null)}
                  onSubmit={(input) =>
                    void ws
                      .run("lineDiscount", (ctx) =>
                        applyLineDiscount(ctx.businessId, ctx.orderId, line.id, {
                          ...input,
                          expectedVersion: ctx.version,
                        })
                      )
                      .then((ok) => ok && setPanel(null))
                  }
                />
              )}
            </li>
          );
        })}
      </ul>

      {open && selected.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--octo-divider)] pt-2.5">
          <span className="text-[12px] text-[var(--octo-text-muted)]">
            {tx("lines.selected").replace("{n}", String(selected.length))}
          </span>
          <OrderButton tone="danger" disabled={!canCancelSelected} onClick={() => setReversal("cancel")}>
            {tx("lines.cancelSelected")}
          </OrderButton>
          <OrderButton tone="warning" disabled={!canVoidSelected} onClick={() => setReversal("void")}>
            {tx("lines.voidSelected")}
          </OrderButton>
          {!canCancelSelected && selectedLines.some((line) => isLineInWork(line.status)) && (
            <span className="text-[11.5px] text-[var(--octo-text-muted)]">{tx("lines.cancelHint")}</span>
          )}
        </div>
      )}

      {reversal && (
        <ReversalForm
          title={reversal === "cancel" ? tx("lines.cancelSelected") : tx("lines.voidSelected")}
          reasonCodes={reasonCodesFor(settings, reversal)}
          accountId={ws.accountId}
          busy={busy}
          approvalNeeded={approvalNeeded}
          confirmLabel={tx("common.confirm")}
          onCancel={() => setReversal(null)}
          onSubmit={(input) => {
            const write = reversal === "cancel" ? cancelOrderLines : voidOrderLines;
            void ws
              .run(reversal === "cancel" ? "cancelLines" : "voidLines", (ctx) =>
                write(ctx.businessId, ctx.orderId, {
                  lineIds: selected,
                  ...input,
                  expectedVersion: ctx.version,
                })
              )
              .then((ok) => {
                if (!ok) return;
                setReversal(null);
                setSelected([]);
              });
          }}
        />
      )}
    </OrderSection>
  );
}
