"use client";

import { MapPin, Store, UtensilsCrossed } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Input, Segmented as SegmentedControl, Select } from "@ui/primitives";
import type { Tenant } from "@/entities/tenant";
import { useOrderingSession } from "@/entities/order";
import { fulfillmentLabel, type FulfillmentChannel } from "@/shared/lib/fulfillment";

export interface SelectFulfillmentProps {
  tenant: Tenant;
}

const CHANNEL_OPTIONS: { id: FulfillmentChannel; icon: typeof MapPin }[] = [
  { id: "delivery", icon: MapPin },
  { id: "takeaway", icon: Store },
  { id: "dine_in", icon: UtensilsCrossed },
];

export function SelectFulfillment({ tenant }: SelectFulfillmentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setChannel, setDeliveryAddress, setBranch, setTable } = useOrderingSession();

  const [channel, setLocalChannel] = useState<FulfillmentChannel>("delivery");
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [branchId, setLocalBranchId] = useState(tenant.branches[0]?.id ?? "");
  const [tableNumber, setLocalTableNumber] = useState("");
  const [tableError, setTableError] = useState<string | null>(null);
  const [tableLocked, setTableLocked] = useState(false);
  const [autoTableMessage, setAutoTableMessage] = useState(false);

  useEffect(() => {
    const table = searchParams.get("table");
    if (table) {
      setLocalChannel("dine_in");
      setLocalTableNumber(table);
      setTableLocked(true);
      setAutoTableMessage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    if (channel === "delivery") {
      const matched = tenant.deliveryZones.some((zone) => address.toLowerCase().includes(zone.toLowerCase()));
      if (!matched) {
        setAddressError(`عذراً، نوصل حالياً إلى: ${tenant.deliveryZones.join("، ")}`);
        return;
      }
      setAddressError(null);
      setChannel(tenant.id, "delivery");
      setDeliveryAddress(address);
      setBranch(tenant.branches[0].id);
      router.push("/menu");
      return;
    }

    if (channel === "takeaway") {
      setChannel(tenant.id, "takeaway");
      setBranch(branchId);
      router.push("/menu");
      return;
    }

    if (!tableNumber.trim()) {
      setTableError("أدخل رقم الطاولة");
      return;
    }
    setTableError(null);
    setChannel(tenant.id, "dine_in");
    setTable(tableNumber);
    setBranch(tenant.branches[0].id);
    router.push("/menu");
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        value={channel}
        onChange={(id) => setLocalChannel(id as FulfillmentChannel)}
        options={CHANNEL_OPTIONS.map(({ id, icon: Icon }) => ({
          id,
          label: (
            <span className="flex items-center gap-1.5">
              <Icon size={14} />
              {fulfillmentLabel(id)}
            </span>
          ),
        }))}
        className="w-full justify-between"
      />

      {channel === "delivery" && (
        <Input
          label="عنوان التوصيل"
          placeholder="مثال: شارع الأمير سلطان، حي النرجس"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          error={addressError ?? undefined}
        />
      )}

      {channel === "takeaway" && (
        <Select label="الفرع" value={branchId} onChange={(event) => setLocalBranchId(event.target.value)}>
          {tenant.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
      )}

      {channel === "dine_in" && (
        <div className="flex flex-col gap-1.5">
          <Input
            label="رقم الطاولة"
            placeholder="مثال: 7"
            value={tableNumber}
            onChange={(event) => setLocalTableNumber(event.target.value)}
            error={tableError ?? undefined}
            readOnly={tableLocked}
            disabled={tableLocked}
          />
          {autoTableMessage && <p className="text-[11px] text-[#22C55E]">تم تحديد الطاولة تلقائياً</p>}
        </div>
      )}

      <Button onClick={handleContinue} className="w-full justify-center">
        متابعة إلى القائمة
      </Button>
    </div>
  );
}
