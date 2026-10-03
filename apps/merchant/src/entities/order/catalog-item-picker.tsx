// Browses one sellable catalog and adds entries (with their options, a
// quantity and a note) to a cart. Knows nothing about orders — the caller
// decides whether the pick goes into a new order or onto an existing one.
import { useMemo, useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import type { SellableCatalogResponse, SellableEntryResponse } from "@octopus/api-client";
import {
  defaultOptionIds,
  entryOffersFulfilment,
  estimateUnitPrice,
  groupsForEntry,
  invalidOptionGroup,
  optionNames,
  toggleOption,
  type DraftLine,
} from "./order-draft";
import { orderInputClass, OrderButton } from "./order-ui";
import { useOrderText } from "./order-text";

function money(amount: number | null, currency: string): string {
  return amount == null ? "—" : `${currency} ${amount.toFixed(2)}`;
}

function OptionPanel({
  catalog,
  entry,
  onCancel,
  onConfirm,
}: {
  catalog: SellableCatalogResponse;
  entry: SellableEntryResponse;
  onCancel: () => void;
  onConfirm: (line: Omit<DraftLine, "key">) => void;
}) {
  const { tx } = useOrderText();
  const groups = useMemo(() => groupsForEntry(catalog, entry), [catalog, entry]);
  const [selected, setSelected] = useState<string[]>(() => defaultOptionIds(groups));
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const invalid = invalidOptionGroup(groups, selected);
  const unitPrice = estimateUnitPrice(entry, groups, selected);

  return (
    <div className="rounded-xl border border-[#0D6EFD]/40 bg-[#0D6EFD]/[0.03] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-bold text-[var(--octo-text-primary)]">{entry.name}</p>
          <p className="text-[12px] text-[var(--octo-text-muted)]">{money(unitPrice, catalog.currency)}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={tx("common.cancel")}
          className="grid h-7 w-7 place-items-center rounded-full text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
        >
          <X size={15} />
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.groupId} className="mt-3">
          <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
            {group.prompt}
            <span className="ms-1.5 font-normal text-[var(--octo-text-muted)]">
              {group.multiple
                ? tx("picker.pickRange")
                    .replace("{min}", String(group.minSelected))
                    .replace("{max}", group.maxSelected == null ? "∞" : String(group.maxSelected))
                : group.minSelected > 0
                  ? tx("picker.pickOne")
                  : tx("picker.optional")}
            </span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {group.options.map((option) => {
              const on = selected.includes(option.optionId);
              return (
                <button
                  key={option.optionId}
                  type="button"
                  disabled={!option.isAvailableNow}
                  aria-pressed={on}
                  onClick={() => setSelected((prev) => toggleOption(groups, prev, group.groupId, option.optionId))}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
                    on
                      ? "border-[#0D6EFD] bg-[#0D6EFD]/10 text-[#0D6EFD]"
                      : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                  }`}
                >
                  {option.name}
                  {option.amount != null && option.amount !== 0 && (
                    <span className="ms-1 text-[11px] opacity-75">
                      {option.effectKind.toLowerCase().includes("fixed") ? "" : "+"}
                      {option.amount.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-[9px] border border-[var(--octo-border-input)]">
          <button
            type="button"
            aria-label="-"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="grid h-9 w-9 place-items-center text-[var(--octo-text-secondary)]"
          >
            <Minus size={14} />
          </button>
          <span className="w-8 text-center text-[13px] font-semibold tabular-nums">{quantity}</span>
          <button
            type="button"
            aria-label="+"
            onClick={() => setQuantity((q) => q + 1)}
            className="grid h-9 w-9 place-items-center text-[var(--octo-text-secondary)]"
          >
            <Plus size={14} />
          </button>
        </div>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={tx("picker.note")}
          className={`${orderInputClass} min-w-[160px] flex-1`}
        />
      </div>

      {invalid && (
        <p className="mt-2 text-[12px] text-[#D97706]">{tx("picker.optionsInvalid").replace("{group}", invalid.prompt)}</p>
      )}

      <OrderButton
        tone="primary"
        className="mt-3 w-full py-2.5 text-[13px]"
        disabled={invalid !== null}
        onClick={() =>
          onConfirm({
            catalogId: catalog.catalogId,
            entryId: entry.entryId,
            name: entry.name,
            unitPrice,
            optionIds: selected,
            optionNames: optionNames(groups, selected),
            quantity,
            note: note.trim() || null,
          })
        }
      >
        {tx("picker.add")}
      </OrderButton>
    </div>
  );
}

export function CatalogItemPicker({
  catalog,
  fulfilmentCode,
  onAdd,
}: {
  catalog: SellableCatalogResponse;
  /** Entries that do not offer this fulfilment are shown disabled — the
   *  backend refuses them (order.catalog.fulfilment-not-offered). */
  fulfilmentCode: string | null;
  onAdd: (line: Omit<DraftLine, "key">) => void;
}) {
  const { tx } = useOrderText();
  const [search, setSearch] = useState("");
  const [configuring, setConfiguring] = useState<SellableEntryResponse | null>(null);

  const entries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog.entries.filter(
      (entry) => !query || entry.name.toLowerCase().includes(query) || (entry.sku ?? "").toLowerCase().includes(query)
    );
  }, [catalog, search]);

  function pick(entry: SellableEntryResponse) {
    if (entry.optionGroupIds.length > 0) {
      setConfiguring(entry);
      return;
    }
    onAdd({
      catalogId: catalog.catalogId,
      entryId: entry.entryId,
      name: entry.name,
      unitPrice: entry.unitPrice,
      optionIds: [],
      optionNames: [],
      quantity: 1,
      note: null,
    });
  }

  if (configuring) {
    return (
      <OptionPanel
        catalog={catalog}
        entry={configuring}
        onCancel={() => setConfiguring(null)}
        onConfirm={(line) => {
          onAdd(line);
          setConfiguring(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-faint)]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={tx("picker.search")}
          className={`${orderInputClass} ps-9`}
        />
      </div>
      {entries.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-[var(--octo-text-muted)]">{tx("picker.empty")}</p>
      ) : (
        <div className="octo-scroll mt-3 grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {entries.map((entry) => {
            const offered = !fulfilmentCode || entryOffersFulfilment(entry, fulfilmentCode);
            const disabled = !entry.isAvailableNow || !offered;
            return (
              <button
                key={entry.entryId}
                type="button"
                disabled={disabled}
                onClick={() => pick(entry)}
                className="flex flex-col items-start gap-1 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3 text-start transition-colors hover:border-[#0D6EFD] hover:bg-[#0D6EFD]/[0.03] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{entry.shortName ?? entry.name}</span>
                <span className="text-[12px] text-[#0D6EFD]">{money(entry.unitPrice, catalog.currency)}</span>
                {!entry.isAvailableNow && <span className="text-[11px] text-[#D97706]">{tx("picker.unavailable")}</span>}
                {entry.isAvailableNow && !offered && (
                  <span className="text-[11px] text-[#D97706]">{tx("picker.notForFulfilment")}</span>
                )}
                {entry.optionGroupIds.length > 0 && (
                  <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("picker.hasOptions")}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
