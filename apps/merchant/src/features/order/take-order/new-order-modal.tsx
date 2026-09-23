// "New order": channel → catalog → items → details → POST /orders.
// Also opens pre-filled from GET /{id}/duplicate ("Re-order"), in which case
// the template's channel, fulfilment, party size, customer and lines are
// loaded into the same flow and the lines the catalog can no longer sell are
// listed as a warning.
//
// POST /orders is idempotent: the Idempotency-Key is derived from the exact
// request, so a retry after a timeout replays the same key (and gets the
// order the first attempt made), while any edit to the draft gets a new one.
import { useEffect, useMemo, useState } from "react";
import { takeOrder, type DuplicateOrderTemplateResponse, type OrderResponse } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import {
  addDraftLine,
  buildTakeOrderRequest,
  CatalogItemPicker,
  DraftCart,
  ResourcePicker,
  type PlaceChoice,
  draftFromTemplate,
  draftItemCount,
  fulfilmentChoices,
  humanizeCode,
  OrderButton,
  OrderErrorNote,
  OrderField,
  orderErrorMessage,
  orderInputClass,
  useOrderSettings,
  useOrderText,
  useSellableCatalog,
  useSellableCatalogs,
  type DraftLine,
} from "@/entities/order";

type Step = 1 | 2 | 3;

const STEP_KEYS = ["newOrder.step.setup", "newOrder.step.items", "newOrder.step.details"] as const;

function StepHeader({ step }: { step: Step }) {
  const { tx } = useOrderText();
  return (
    <ol className="mt-4 flex items-center gap-2">
      {STEP_KEYS.map((key, index) => {
        const n = (index + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <li key={key} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11.5px] font-bold ${
                active || done ? "bg-[#0D6EFD] text-white" : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"
              }`}
            >
              {n}
            </span>
            <span
              className={`text-[12.5px] font-medium ${active ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-muted)]"}`}
            >
              {tx(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function NewOrderModal({
  open,
  template,
  onClose,
  onCreated,
}: {
  open: boolean;
  /** Pre-fills the flow from GET /{id}/duplicate. */
  template?: DuplicateOrderTemplateResponse | null;
  onClose: () => void;
  onCreated: (order: OrderResponse) => void;
}) {
  const { tx } = useOrderText();
  const { activeBusinessId } = useAuth();
  const { sources, loading: sourcesLoading, error: sourcesError } = useOrderSettings(open);
  const enabledSources = sources.filter((source) => source.isEnabled);

  const [step, setStep] = useState<Step>(1);
  const [sourceCode, setSourceCode] = useState<string>("pos");
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [fulfilmentCode, setFulfilmentCode] = useState<string>("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [templateApplied, setTemplateApplied] = useState(false);
  const [place, setPlace] = useState<PlaceChoice | null>(null);
  const [attendees, setAttendees] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogs = useSellableCatalogs(open ? sourceCode : null);
  const catalog = useSellableCatalog(open ? catalogId : null, sourceCode);

  // Reset on every open, then seed from the template when there is one.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSourceCode(template?.sourceCode ?? "pos");
    setCatalogId(template?.lines[0]?.catalogId ?? null);
    setFulfilmentCode(template?.fulfilmentCode ?? "");
    setLines([]);
    setTemplateApplied(false);
    setPlace(null);
    setAttendees(template?.attendeeCount != null ? String(template.attendeeCount) : "");
    setCustomerName(template?.customer.name ?? "");
    setCustomerPhone(template?.customer.phone ?? "");
    setCustomerEmail(template?.customer.email ?? "");
    setDeliveryAddress("");
    setCustomerNote("");
    setInternalNote("");
    setError(null);
  }, [open, template]);

  // First sellable catalog by default.
  useEffect(() => {
    if (catalogId || catalogs.data.length === 0) return;
    const first = catalogs.data.find((candidate) => candidate.isSellableNow);
    if (first) setCatalogId(first.catalogId);
  }, [catalogs.data, catalogId]);

  const fulfilmentOptions = useMemo(() => (catalog.data ? fulfilmentChoices(catalog.data) : []), [catalog.data]);

  useEffect(() => {
    if (fulfilmentOptions.length > 0 && !fulfilmentOptions.includes(fulfilmentCode)) {
      setFulfilmentCode(fulfilmentOptions[0]);
    }
  }, [fulfilmentOptions, fulfilmentCode]);

  useEffect(() => {
    if (!template || templateApplied || !catalog.data) return;
    setLines(draftFromTemplate(template, catalog.data));
    setTemplateApplied(true);
  }, [template, templateApplied, catalog.data]);

  const request = useMemo(
    () =>
      activeBusinessId
        ? buildTakeOrderRequest({
            businessId: activeBusinessId,
            branchId: template?.branchId ?? null,
            sourceCode,
            fulfilmentCode,
            place: place ? { containerId: place.containerId, resourceId: place.resourceId } : null,
            attendeeCount: attendees ? Number(attendees) : null,
            customerName,
            customerPhone,
            customerEmail,
            deliveryAddress,
            customerNote,
            internalNote,
            lines,
          })
        : null,
    [
      activeBusinessId,
      template,
      sourceCode,
      fulfilmentCode,
      place,
      attendees,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      customerNote,
      internalNote,
      lines,
    ]
  );
  const requestJson = JSON.stringify(request);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [requestJson]);

  async function submit() {
    if (!activeBusinessId || !request) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await takeOrder(activeBusinessId, request, idempotencyKey);
      onCreated(order);
    } catch (err) {
      setError(orderErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const currency = catalog.data?.currency ?? "SAR";
  const canNext1 = Boolean(sourceCode && catalogId && fulfilmentCode && catalog.data);
  const canNext2 = lines.length > 0;

  return (
    <Modal open={open} onClose={onClose} className="max-h-[90vh] max-w-[860px] overflow-y-auto">
      <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">
        {template ? tx("newOrder.reorderTitle") : tx("newOrder.title")}
      </h2>
      <p className="mt-1 text-[13px] text-[var(--octo-text-muted)]">{tx("newOrder.subtitle")}</p>
      <StepHeader step={step} />

      {template && template.unavailableLines.length > 0 && (
        <div className="mt-3 rounded-[10px] bg-[#F59E0B]/10 px-3.5 py-2.5 text-[12.5px] text-[#B45309]">
          <p className="font-semibold">{tx("newOrder.unavailableLines")}</p>
          <ul className="mt-1 list-disc ps-5">
            {template.unavailableLines.map((line) => (
              <li key={line.entryId}>
                {line.displayName} — {humanizeCode(line.reason)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <OrderErrorNote message={error ?? sourcesError} onDismiss={error ? () => setError(null) : undefined} />

      {step === 1 && (
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <OrderField label={tx("newOrder.source")}>
            <select
              value={sourceCode}
              onChange={(event) => {
                setSourceCode(event.target.value);
                setCatalogId(null);
                setLines([]);
              }}
              className={orderInputClass}
              disabled={sourcesLoading}
            >
              {enabledSources.length === 0 && <option value="pos">pos</option>}
              {enabledSources.map((source) => (
                <option key={source.code} value={source.code}>
                  {source.displayName}
                </option>
              ))}
            </select>
          </OrderField>
          <OrderField label={tx("newOrder.catalog")}>
            <select
              value={catalogId ?? ""}
              onChange={(event) => {
                setCatalogId(event.target.value || null);
                setLines([]);
              }}
              className={orderInputClass}
              disabled={catalogs.loading}
            >
              <option value="">
                {catalogs.loading
                  ? tx("common.loading")
                  : catalogs.data.length === 0
                    ? tx("newOrder.noCatalogs")
                    : tx("newOrder.chooseCatalog")}
              </option>
              {catalogs.data.map((candidate) => (
                <option key={candidate.catalogId} value={candidate.catalogId} disabled={!candidate.isSellableNow}>
                  {candidate.displayName}
                  {!candidate.isSellableNow && candidate.notSellableReason
                    ? ` (${humanizeCode(candidate.notSellableReason)})`
                    : ""}
                </option>
              ))}
            </select>
          </OrderField>
          <OrderField label={tx("newOrder.fulfilment")}>
            <select
              value={fulfilmentCode}
              onChange={(event) => setFulfilmentCode(event.target.value)}
              className={orderInputClass}
              disabled={fulfilmentOptions.length === 0}
            >
              {fulfilmentOptions.map((code) => (
                <option key={code} value={code}>
                  {humanizeCode(code)}
                </option>
              ))}
            </select>
          </OrderField>
          {(catalogs.error || catalog.error) && (
            <p className="text-[12.5px] text-[#DC2626] sm:col-span-3">{catalogs.error ?? catalog.error}</p>
          )}
          {catalog.loading && (
            <p className="text-[12.5px] text-[var(--octo-text-muted)] sm:col-span-3">{tx("common.loading")}</p>
          )}
        </div>
      )}

      {step === 2 && catalog.data && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <CatalogItemPicker
            catalog={catalog.data}
            fulfilmentCode={fulfilmentCode}
            onAdd={(line) => setLines((prev) => addDraftLine(prev, line))}
          />
          <div className="rounded-xl border border-[var(--octo-border-card)] p-3.5">
            <p className="text-[13px] font-bold text-[var(--octo-text-primary)]">
              {tx("cart.title").replace("{n}", String(draftItemCount(lines)))}
            </p>
            <DraftCart lines={lines} currency={currency} onChange={setLines} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4 flex flex-col gap-3.5">
          <ResourcePicker value={place} onChange={setPlace} />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <OrderField label={tx("details.attendees")}>
              <input
                type="number"
                min={1}
                value={attendees}
                onChange={(event) => setAttendees(event.target.value)}
                className={orderInputClass}
              />
            </OrderField>
            <OrderField label={tx("contact.name")}>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className={orderInputClass} />
            </OrderField>
            <OrderField label={tx("contact.phone")}>
              <input
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className={orderInputClass}
                placeholder="+9665XXXXXXXX"
              />
            </OrderField>
            <OrderField label={tx("contact.email")}>
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className={orderInputClass}
              />
            </OrderField>
            <OrderField label={tx("details.deliveryAddress")} className="sm:col-span-2">
              <input
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                className={orderInputClass}
              />
            </OrderField>
            <OrderField label={tx("details.customerNote")}>
              <input value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} className={orderInputClass} />
            </OrderField>
            <OrderField label={tx("details.internalNote")}>
              <input value={internalNote} onChange={(event) => setInternalNote(event.target.value)} className={orderInputClass} />
            </OrderField>
          </div>
          <div className="rounded-xl bg-[#0D6EFD]/[0.05] px-4 py-3 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--octo-text-muted)]">{tx("cart.title").replace("{n}", String(draftItemCount(lines)))}</span>
              <span className="font-bold text-[#0D6EFD]">
                {currency} {lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0).toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{tx("cart.serverPrices")}</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        <OrderButton onClick={step === 1 ? onClose : () => setStep((step - 1) as Step)}>
          {step === 1 ? tx("common.cancel") : tx("common.back")}
        </OrderButton>
        {step < 3 ? (
          <OrderButton
            tone="primary"
            disabled={step === 1 ? !canNext1 : !canNext2}
            onClick={() => setStep((step + 1) as Step)}
          >
            {tx("common.next")}
          </OrderButton>
        ) : (
          <OrderButton tone="primary" disabled={submitting || !canNext2} onClick={() => void submit()}>
            {submitting ? tx("common.saving") : tx("newOrder.submit")}
          </OrderButton>
        )}
      </div>
    </Modal>
  );
}
