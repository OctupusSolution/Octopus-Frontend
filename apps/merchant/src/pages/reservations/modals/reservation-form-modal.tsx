// The Edit Reservation dialog. Adding a reservation is a full page now
// (pages/reservations/new); the fields both use live in
// _shared/reservation-form.tsx so the two can't drift apart.
import { useEffect, useMemo, useState } from "react";
import { Calendar, FileText, Send, User } from "lucide-react";
import { Button, Modal, Tabs, type TabItem } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { useFloorPlan } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import type { FloorTable } from "@/entities/floor-plan";
import { type Reservation } from "@/shared/api/mock-reservations";
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
import { useReservationActions } from "../_shared/reservations-store";
import { isSlotTakenError, type AlternativeSlot } from "../_shared/reservations-api";
import { AlternativesPicker, type AlternativesState } from "../_shared/alternatives-picker";

export interface ReservationFormModalProps {
  open: boolean;
  mode: FormMode;
  /** Required when `mode === "edit"` — the row being edited. */
  reservation: Reservation | null;
  onClose: () => void;
  /** `resourceId` is the real floor-plan table backing whatever `draft.table`
   *  reads, when the picked table matches one on the live plan — null means
   *  either nothing changed or the picked value has no real table behind it
   *  (an edit dialog with no live plan loaded, say), so the caller must not
   *  reassign the reservation's table just because this is null.
   *  In edit mode the caller may return a promise that rejects with the
   *  server's "slot taken" error — the dialog then stays open and offers the
   *  nearest free times (GET /availability/alternatives) instead. */
  onSubmit: (draft: Reservation, intent: "pending" | "confirm", resourceId: string | null) => void | Promise<void>;
  /** Edit mode's red "Cancel Reservation" footer button. */
  onRequestCancel: () => void;
  /** Edit mode's "View Payment" — opens the reservation's payment details. */
  onViewPayment?: () => void;
  /** Which tab to open on — the row's "Add Note" opens straight onto Notes. */
  initialTab?: "details" | "guest" | "notes";
}

// The live floor plan's own tables, plus whatever table the reservation is
// already on even if the floor doesn't list it — otherwise the controlled
// <select> falls back to "Any Available" and touching it loses the table.
// Picking one of the plan's own tables is what makes `numberToId` resolve to
// a real resourceId at submit time (see BACKEND_GAPS 4.7b — the old version
// of this picked from a local mock list, so a changed table here never once
// reached the server: `updateReservation` has no `resourceId` field at all,
// only `assignReservationResource` does, and this dialog never called it).
function tableOptionsFor(tables: readonly FloorTable[], reservation: Reservation | null): string[] {
  const base = new Set(tables.filter((t) => t.reservable && !t.blocked).map((t) => t.number));
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
  const { published } = useFloorPlan();
  const planTables = published?.doc.tables ?? [];
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [draft, setDraft] = useState<DraftState>(() => initDraft(mode, reservation));
  const [alternatives, setAlternatives] = useState<AlternativesState | null>(null);
  const [saving, setSaving] = useState(false);
  const actions = useReservationActions();

  // One draft holds every field whichever tab is showing, so switching tabs
  // never loses input. Re-seeded each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDraft(initDraft(mode, reservation));
      setActiveTab(initialTab);
      setAlternatives(null);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, reservation?.id, initialTab]);

  const tableOptions = useMemo(() => tableOptionsFor(planTables, reservation), [planTables, reservation]);
  // The published plan's own spot id (a real resourceId once the plan has
  // been pulled from the server — see use-floor-plan.ts's `publish`) for
  // whichever table number is currently picked.
  const numberToId = useMemo(() => new Map(planTables.map((t) => [t.number, t.id])), [planTables]);
  const { canSavePending, canConfirm } = draftValidity(draft);

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function submit(intent: "pending" | "confirm") {
    const resourceId = draft.table ? numberToId.get(draft.table) ?? null : null;
    const result = onSubmit(buildReservation(draft, mode, reservation, intent), intent, resourceId);
    if (!result || !reservation) return;
    setSaving(true);
    setAlternatives(null);
    const refused = { date: draft.date, time: draft.time, partySize: draft.partySize, durationMinutes: draft.durationMinutes };
    result
      .catch((err: unknown) => {
        if (!isSlotTakenError(err)) return;
        // The reschedule runs before any table change (see updateRow), so the
        // refusal is about the table the reservation already holds.
        setActiveTab("details");
        setAlternatives({ kind: "loading" });
        actions
          .alternatives(refused, { reservationId: reservation.id })
          .then((slots) => setAlternatives({ kind: "ready", slots }))
          .catch(() => setAlternatives({ kind: "error" }));
      })
      .finally(() => setSaving(false));
  }

  function pickAlternative(slot: AlternativeSlot) {
    setDraft((prev) => ({ ...prev, date: slot.date, time: slot.minutes }));
    setAlternatives(null);
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
      <Button variant="primary" icon={<Send size={14} />} disabled={!canConfirm || saving} onClick={() => submit("confirm")}>
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
      {alternatives && (
        <div className="mb-4">
          <AlternativesPicker state={alternatives} onPick={pickAlternative} />
        </div>
      )}
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
