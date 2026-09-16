// The Edit Reservation dialog. Adding a reservation is a full page now
// (pages/reservations/new); the fields both use live in
// _shared/reservation-form.tsx so the two can't drift apart.
import { useEffect, useMemo, useState } from "react";
import { Calendar, FileText, Send, User } from "lucide-react";
import { Button, Modal, Tabs, type TabItem } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { floorTables, type Reservation } from "@/shared/api/mock-reservations";
import {
  buildReservation,
  DEFAULT_AREAS,
  draftValidity,
  GREY_CANCEL,
  GuestDetailsFields,
  initDraft,
  LinkNotice,
  NoteField,
  ReservationDetailsFields,
  type DraftState,
  type FormMode,
} from "../_shared/reservation-form";

export interface ReservationFormModalProps {
  open: boolean;
  mode: FormMode;
  /** Required when `mode === "edit"` — the row being edited. */
  reservation: Reservation | null;
  onClose: () => void;
  onSubmit: (draft: Reservation, intent: "pending" | "confirm") => void;
  /** Edit mode's red "Cancel Reservation" footer button. */
  onRequestCancel: () => void;
  /** Edit mode's "View Payment" — opens the reservation's payment details. */
  onViewPayment?: () => void;
  /** Which tab to open on — the row's "Add Note" opens straight onto Notes. */
  initialTab?: "details" | "guest" | "notes";
}

// The floor plan's table numbers, plus whatever table the reservation is
// already on even if the floor doesn't list it — otherwise the controlled
// <select> falls back to "Any Available" and touching it loses the table.
function tableOptionsFor(reservation: Reservation | null): string[] {
  const base = new Set(floorTables.map((table) => table.number));
  if (reservation?.table) base.add(reservation.table);
  return Array.from(base).sort();
}

export function ReservationFormModal({
  open,
  mode,
  reservation,
  onClose,
  onSubmit,
  onRequestCancel,
  onViewPayment,
  initialTab = "details",
}: ReservationFormModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [draft, setDraft] = useState<DraftState>(() => initDraft(mode, reservation));

  // One draft holds every field whichever tab is showing, so switching tabs
  // never loses input. Re-seeded each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDraft(initDraft(mode, reservation));
      setActiveTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, reservation?.id, initialTab]);

  const tableOptions = useMemo(() => tableOptionsFor(reservation), [reservation]);
  const { canSavePending, canConfirm } = draftValidity(draft);

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function submit(intent: "pending" | "confirm") {
    onSubmit(buildReservation(draft, mode, reservation, intent), intent);
  }

  const tabItems: TabItem[] = [
    { id: "details", label: <TabLabel icon={<Calendar size={14} />} text={t("reservations.form.tab.details")} /> },
    { id: "guest", label: <TabLabel icon={<User size={14} />} text={t("reservations.form.tab.guest")} /> },
    { id: "notes", label: <TabLabel icon={<FileText size={14} />} text={t("reservations.form.tab.notes")} /> },
  ];

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} className={GREY_CANCEL}>
        {t("common.cancel")}
      </Button>
      {mode === "add" ? (
        <Button
          variant="secondary"
          disabled={!canSavePending}
          onClick={() => submit("pending")}
          className="!border-[#0D6EFD] !text-[#0D6EFD] hover:!bg-[#0D6EFD]/5"
        >
          {t("reservations.form.saveAsPending")}
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={onRequestCancel}
          className="!border-transparent !bg-[var(--octo-tone-danger-bg)] !text-[var(--octo-tone-danger-text)] hover:!bg-[var(--octo-tone-danger-bg)]"
        >
          {t("reservations.form.cancelReservation")}
        </Button>
      )}
      <Button variant="primary" icon={<Send size={14} />} disabled={!canConfirm} onClick={() => submit("confirm")}>
        {t("reservations.form.createAndSend")}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(mode === "add" ? "reservations.form.addTitle" : "reservations.form.editTitle")}
      className="!max-w-[760px]"
      footer={footer}
    >
      <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

      <div className="mt-4 max-h-[62vh] space-y-4 overflow-y-auto pe-1">
        {activeTab === "details" && (
          <ReservationDetailsFields
            mode={mode}
            draft={draft}
            update={update}
            reservation={reservation}
            areaOptions={DEFAULT_AREAS}
            tableOptions={tableOptions}
            onViewPayment={onViewPayment}
          />
        )}
        {activeTab === "guest" && <GuestDetailsFields draft={draft} update={update} />}
        {activeTab === "notes" && <NoteField draft={draft} update={update} />}
      </div>

      {/* A payment link only goes out on creation; the Edit frame has no notice. */}
      {mode === "add" && draft.depositEnabled && <LinkNotice className="mt-4" />}
    </Modal>
  );
}

function TabLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
}
