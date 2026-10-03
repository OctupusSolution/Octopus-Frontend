import { useEffect, useState } from "react";
import { CalendarCheck, X } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import { MAX_PARTY_SIZE, type FloorTable } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { NumberStepper, TextField } from "../_shared/fields";
import { formatDate, formatTime } from "../_shared/format";
import { seatsLabel } from "../_shared/labels";
import type { SlotQuery } from "./booking-bar";

export function BookTableModal({
  open,
  table,
  query,
  onClose,
  onConfirm,
}: {
  open: boolean;
  table: FloorTable | null;
  query: SlotQuery;
  onClose: () => void;
  onConfirm: (details: { guestName: string; partySize: number }) => void;
}) {
  const { t, locale } = useI18n();
  const [guestName, setGuestName] = useState("");
  const [partySize, setPartySize] = useState(query.partySize);

  useEffect(() => {
    if (open) {
      setGuestName("");
      setPartySize(query.partySize);
    }
  }, [open, query.partySize]);

  if (!table) return null;
  const tooMany = partySize > table.seats;

  return (
    <Modal open={open} onClose={onClose} className="max-w-md p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0D6EFD]/10 text-[#0D6EFD]">
            <CalendarCheck size={20} />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">
              {t("floorPlan.booking.modalTitle").replace("{number}", table.number)}
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--octo-text-muted)]">
              {formatDate(query.at, locale)} · {formatTime(query.at, locale)} · {seatsLabel(table.seats, t)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("floorPlan.common.close")}
          className="-me-1 grid h-8 w-8 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <TextField
          label={t("floorPlan.live.detail.guestName")}
          value={guestName}
          maxLength={60}
          placeholder={t("floorPlan.booking.guestPlaceholder")}
          onChange={setGuestName}
        />
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.booking.party")}</span>
          <NumberStepper value={partySize} min={1} max={MAX_PARTY_SIZE} label={t("floorPlan.booking.party")} onChange={setPartySize} />
          {tooMany && <p className="text-[12px] text-[var(--octo-tone-danger-text)]">{t("floorPlan.booking.tooMany").replace("{n}", String(table.seats))}</p>}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} className="h-10 justify-center px-4 text-[13px]">
          {t("floorPlan.common.cancel")}
        </Button>
        <Button
          disabled={!guestName.trim() || tooMany}
          icon={<CalendarCheck size={15} />}
          onClick={() => onConfirm({ guestName: guestName.trim(), partySize })}
          className="h-10 justify-center px-5 text-[13px]"
        >
          {t("floorPlan.booking.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
