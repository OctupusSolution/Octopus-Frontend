// Order module settings + channels (PUT /settings, PUT /settings/sources).
// Same approach as reservation-settings-modal: PUT /settings replaces the
// WHOLE document, so the full object fetched from the server is kept in
// state and sent back with only the edited fields changed. Channels share
// the settings version, so they are saved second, with the version the
// settings save returned.
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  updateOrderSettings,
  updateOrderSources,
  type OrderSettingsResponse,
  type OrderSourceResponse,
  type UpdateOrderSettingsRequest,
} from "@octopus/api-client";
import { Button, Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import {
  OrderErrorNote,
  OrderField,
  orderErrorMessage,
  orderInputClass,
  useOrderSettings,
  useOrderText,
} from "@/entities/order";

type NumberField =
  | "taxRatePercent"
  | "serviceChargePercent"
  | "discountWithoutApprovalUpTo"
  | "refundWithoutApprovalUpTo"
  | "refundWindowDays"
  | "paymentLinkLifetimeHours";

type BoolField = "taxInclusive" | "requireApprovalForVoid" | "requireApprovalForCancel" | "requireApprovalForWastage";

type ReasonField = "cancelReasonCodes" | "voidReasonCodes" | "refundReasonCodes" | "wastageReasonCodes" | "discountReasonCodes";

const REASON_FIELDS: readonly ReasonField[] = [
  "cancelReasonCodes",
  "voidReasonCodes",
  "refundReasonCodes",
  "wastageReasonCodes",
  "discountReasonCodes",
];

const CODE_PATTERN = /^[a-z][a-z0-9-]{1,30}$/;

function toRequest(settings: OrderSettingsResponse): UpdateOrderSettingsRequest {
  const { version, ...rest } = settings;
  return { ...rest, expectedVersion: version };
}

export function OrderSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tx } = useOrderText();
  const { activeBusinessId } = useAuth();
  const loaded = useOrderSettings(open);
  const [settings, setSettings] = useState<OrderSettingsResponse | null>(null);
  const [sources, setSources] = useState<OrderSourceResponse[]>([]);
  const [reasonText, setReasonText] = useState<Record<ReasonField, string>>({
    cancelReasonCodes: "",
    voidReasonCodes: "",
    refundReasonCodes: "",
    wastageReasonCodes: "",
    discountReasonCodes: "",
  });
  const [newSource, setNewSource] = useState({ code: "", displayName: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded.settings) return;
    setSettings(loaded.settings);
    setReasonText({
      cancelReasonCodes: loaded.settings.cancelReasonCodes.join(", "),
      voidReasonCodes: loaded.settings.voidReasonCodes.join(", "),
      refundReasonCodes: loaded.settings.refundReasonCodes.join(", "),
      wastageReasonCodes: loaded.settings.wastageReasonCodes.join(", "),
      discountReasonCodes: loaded.settings.discountReasonCodes.join(", "),
    });
  }, [loaded.settings]);

  useEffect(() => {
    setSources(loaded.sources.map((source) => ({ ...source })));
  }, [loaded.sources]);

  function patchNumber(key: NumberField, value: string) {
    setSettings((prev) => (prev ? { ...prev, [key]: Math.max(0, Number(value) || 0) } : prev));
  }

  function patchBool(key: BoolField, value: boolean) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchSource(code: string, patch: Partial<OrderSourceResponse>) {
    setSources((prev) => prev.map((source) => (source.code === code ? { ...source, ...patch } : source)));
  }

  function addSource() {
    const code = newSource.code.trim().toLowerCase();
    if (!CODE_PATTERN.test(code)) {
      setError(tx("settings.sourceCodeInvalid"));
      return;
    }
    if (sources.some((source) => source.code === code)) {
      setError(tx("settings.sourceCodeTaken"));
      return;
    }
    setError(null);
    setSources((prev) => [
      ...prev,
      {
        code,
        displayName: newSource.displayName.trim() || code,
        autoAccept: false,
        isEnabled: true,
        isSeeded: false,
        sortOrder: prev.reduce((max, source) => Math.max(max, source.sortOrder), 0) + 1,
      },
    ]);
    setNewSource({ code: "", displayName: "" });
  }

  async function save() {
    if (!activeBusinessId || !settings) return;
    setSaving(true);
    setError(null);
    try {
      const reasons = Object.fromEntries(
        REASON_FIELDS.map((field) => [
          field,
          reasonText[field]
            .split(",")
            .map((code) => code.trim())
            .filter((code) => code !== ""),
        ])
      ) as Record<ReasonField, string[]>;
      const saved = await updateOrderSettings(activeBusinessId, toRequest({ ...settings, ...reasons }));
      await updateOrderSources(activeBusinessId, {
        sources: sources.map(({ code, displayName, autoAccept, isEnabled, sortOrder }) => ({
          code,
          displayName,
          autoAccept,
          isEnabled,
          sortOrder,
        })),
        expectedVersion: saved.version,
      });
      loaded.reload();
      onClose();
    } catch (err) {
      setError(orderErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const numberInput = (key: NumberField, label: string, step = "1") =>
    settings && (
      <OrderField label={label}>
        <input
          type="number"
          min={0}
          step={step}
          value={settings[key]}
          onChange={(event) => patchNumber(key, event.target.value)}
          className={orderInputClass}
        />
      </OrderField>
    );

  const checkbox = (key: BoolField, label: string) =>
    settings && (
      <label className="flex items-center gap-2 text-[13px] text-[var(--octo-text-primary)]">
        <input type="checkbox" checked={settings[key]} onChange={(event) => patchBool(key, event.target.checked)} />
        {label}
      </label>
    );

  return (
    <Modal open={open} onClose={onClose} title={tx("settings.title")} className="max-w-2xl">
      {loaded.loading || !settings ? (
        loaded.error ? (
          <OrderErrorNote message={loaded.error} />
        ) : (
          <p className="py-6 text-center text-[13px] text-[var(--octo-text-secondary)]">{tx("common.loading")}</p>
        )
      ) : (
        <div className="octo-scroll max-h-[65vh] overflow-y-auto pe-1">
          <OrderErrorNote message={error} onDismiss={() => setError(null)} />

          <h3 className="mt-2 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{tx("settings.pricing")}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {numberInput("taxRatePercent", tx("settings.taxRate"), "0.01")}
            {numberInput("serviceChargePercent", tx("settings.serviceCharge"), "0.01")}
            <OrderField label={tx("settings.timeZone")}>
              <input
                value={settings.timeZoneId}
                onChange={(event) => setSettings({ ...settings, timeZoneId: event.target.value })}
                className={orderInputClass}
              />
            </OrderField>
          </div>
          <div className="mt-3">{checkbox("taxInclusive", tx("settings.taxInclusive"))}</div>

          <h3 className="mt-5 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{tx("settings.approvals")}</h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {checkbox("requireApprovalForVoid", tx("settings.approveVoid"))}
            {checkbox("requireApprovalForCancel", tx("settings.approveCancel"))}
            {checkbox("requireApprovalForWastage", tx("settings.approveWastage"))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {numberInput("discountWithoutApprovalUpTo", tx("settings.discountThreshold"), "0.01")}
            {numberInput("refundWithoutApprovalUpTo", tx("settings.refundThreshold"), "0.01")}
            {numberInput("refundWindowDays", tx("settings.refundWindow"))}
            {numberInput("paymentLinkLifetimeHours", tx("settings.linkLifetime"))}
            <OrderField label={tx("settings.receiptTemplate")}>
              <input
                value={settings.receiptTemplateKey}
                onChange={(event) => setSettings({ ...settings, receiptTemplateKey: event.target.value })}
                className={orderInputClass}
              />
            </OrderField>
          </div>

          <h3 className="mt-5 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{tx("settings.reasons")}</h3>
          <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{tx("settings.reasonsHint")}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REASON_FIELDS.map((field) => (
              <OrderField key={field} label={tx(`settings.${field}`)}>
                <input
                  value={reasonText[field]}
                  onChange={(event) => setReasonText((prev) => ({ ...prev, [field]: event.target.value }))}
                  className={orderInputClass}
                />
              </OrderField>
            ))}
          </div>

          <h3 className="mt-5 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{tx("settings.sources")}</h3>
          <div className="mt-3 flex flex-col gap-2">
            {sources.map((source) => (
              <div
                key={source.code}
                className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2"
              >
                <div className="min-w-[160px] flex-1">
                  {source.isSeeded ? (
                    <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{source.displayName}</p>
                  ) : (
                    <input
                      value={source.displayName}
                      onChange={(event) => patchSource(source.code, { displayName: event.target.value })}
                      className={orderInputClass}
                    />
                  )}
                  <p className="mt-0.5 text-[11.5px] text-[var(--octo-text-muted)]">
                    {source.code}
                    {source.isSeeded ? ` · ${tx("settings.platformSource")}` : ""}
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={source.isEnabled}
                    onChange={(event) => patchSource(source.code, { isEnabled: event.target.checked })}
                  />
                  {tx("settings.enabled")}
                </label>
                <label className="flex items-center gap-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={source.autoAccept}
                    onChange={(event) => patchSource(source.code, { autoAccept: event.target.checked })}
                  />
                  {tx("settings.autoAccept")}
                </label>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <OrderField label={tx("settings.newSourceCode")} className="w-[160px]">
              <input
                value={newSource.code}
                onChange={(event) => setNewSource((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="delivery-app"
                className={orderInputClass}
              />
            </OrderField>
            <OrderField label={tx("settings.newSourceName")} className="min-w-[160px] flex-1">
              <input
                value={newSource.displayName}
                onChange={(event) => setNewSource((prev) => ({ ...prev, displayName: event.target.value }))}
                className={orderInputClass}
              />
            </OrderField>
            <Button variant="secondary" onClick={addSource} icon={<Plus size={14} />} className="h-10">
              {tx("settings.addSource")}
            </Button>
          </div>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {tx("common.cancel")}
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={loaded.loading || saving || !settings}>
          {saving ? tx("common.saving") : tx("common.save")}
        </Button>
      </div>
    </Modal>
  );
}
