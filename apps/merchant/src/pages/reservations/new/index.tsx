// Add a reservation: a full page rather than the old dialog, in two steps —
// the reservation and guest details, then the table on the floor plan. The
// fields are the same ones the Edit dialog uses (_shared/reservation-form).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight, Calendar, Send, User } from "lucide-react";
import { createBooking } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { useBookings } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import { applyFormSubmit } from "../_shared/model";
import { RESERVATIONS_PATH } from "../_shared/paths";
import { useReservations } from "../_shared/reservations-store";
import {
  buildReservation,
  draftValidity,
  GuestDetailsFields,
  initDraft,
  LinkNotice,
  ReservationDetailsFields,
  type DraftState,
} from "../_shared/reservation-form";
import { SelectTableStep, useTablePicking } from "./select-table-step";
import { Stepper } from "./stepper";

type Step = 1 | 2 | 3;

export function NewReservationPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [, setRows] = useReservations();
  const { addBooking } = useBookings();

  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<DraftState>(() => initDraft("add", null));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const picking = useTablePicking(draft);
  const { canSavePending, canConfirm } = draftValidity(draft);

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  // Step 1 offers the same areas and tables step 2 draws, so a preference
  // always names something that exists on the floor.
  const areaOptions = useMemo(() => picking.doc.zones.map((zone) => zone.name), [picking.doc]);
  const tableOptions = useMemo(
    () => picking.options.map((option) => option.table.number).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [picking.options]
  );

  useEffect(() => {
    if (areaOptions.length > 0 && !areaOptions.includes(draft.area)) update("area", areaOptions[0]);
    // Only when the floor's zones change; the user's own choice is left alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaOptions]);

  // Arriving on step 2 selects the table a host would most likely pick: the
  // preferred one if it's free, otherwise the best fit. An existing, still
  // valid selection (e.g. after going back to edit details) is kept.
  useEffect(() => {
    if (step !== 3) return;
    const current = selectedId ? picking.byId.get(selectedId) : undefined;
    if (current && picking.selectable(current)) return;
    setSelectedId(picking.best(draft.table)?.table.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const selected = selectedId ? (picking.byId.get(selectedId) ?? null) : null;
  const tableReady = selected !== null && picking.selectable(selected);

  // Guest first, then the reservation, then the table: each step opens once
  // the one before it has what it needs.
  const maxReachable: Step = !canSavePending ? 1 : !canConfirm ? 2 : 3;

  function goToStep(next: number) {
    if (next > maxReachable) return;
    setStep(next as Step);
    window.scrollTo({ top: 0 });
  }

  function save(intent: "pending" | "confirm") {
    const withTable: DraftState =
      tableReady && selected ? { ...draft, table: selected.table.number, area: selected.zoneName ?? draft.area } : draft;
    const reservation = buildReservation(withTable, "add", null, intent);
    setRows((prev) => applyFormSubmit(prev, reservation, intent, "add", null));
    // Book the table on the floor plan too, so Floor Plan shows it reserved.
    if (tableReady && selected) addBooking(createBooking(selected.table.id, picking.at, draft.partySize, reservation.guest));
    navigate(RESERVATIONS_PATH);
  }

  const nextEnabled = step === 1 ? canSavePending : canConfirm;

  return (
    <div className="px-4 pb-10 pt-5 sm:px-8 sm:pt-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[24px]">
            {step === 3 ? t("reservations.table.title") : t("reservations.form.addTitle")}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">
            {step === 3 ? t("reservations.table.subtitle") : t("reservations.subtitle")}
          </p>
        </div>
        <Stepper
          step={step}
          labels={[t("reservations.form.tab.guest"), t("reservations.form.tab.details"), t("reservations.new.stepTable")]}
          maxReachable={maxReachable}
          onStepClick={goToStep}
        />
      </header>

      {step === 1 ? (
        <section className="mt-5 space-y-4">
          <StepHeading icon={<User size={16} />} text={t("reservations.form.tab.guest")} />
          <GuestDetailsFields draft={draft} update={update} withNote />
        </section>
      ) : step === 2 ? (
        <section className="mt-5 space-y-4">
          <StepHeading icon={<Calendar size={16} />} text={t("reservations.form.tab.details")} />
          <ReservationDetailsFields
            mode="add"
            draft={draft}
            update={update}
            reservation={null}
            areaOptions={areaOptions}
            tableOptions={tableOptions}
          />
          {draft.depositEnabled && <LinkNotice />}
        </section>
      ) : (
        <section className="mt-5">
          <SelectTableStep
            picking={picking}
            draft={draft}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEditDetails={() => goToStep(2)}
          />
        </section>
      )}

      <footer className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.3fr_2.4fr]">
        <FooterButton tone="grey" onClick={() => navigate(RESERVATIONS_PATH)}>
          {t("common.cancel")}
        </FooterButton>
        <FooterButton tone="soft" disabled={!canSavePending} onClick={() => save("pending")}>
          {t("reservations.form.saveAsPending")}
        </FooterButton>
        {step < 3 ? (
          <FooterButton
            tone="primary"
            disabled={!nextEnabled}
            title={nextEnabled ? undefined : t("reservations.new.nextNeeds")}
            onClick={() => goToStep(step + 1)}
          >
            {t("reservations.new.next")}
            <ArrowRight size={17} className="rtl:rotate-180" />
          </FooterButton>
        ) : (
          <FooterButton
            tone="primary"
            disabled={!canConfirm || !tableReady}
            title={tableReady ? undefined : t("reservations.table.needsTable")}
            onClick={() => save("confirm")}
          >
            <Send size={16} className="rtl:-scale-x-100" />
            {t("reservations.form.createAndSend")}
          </FooterButton>
        )}
      </footer>
    </div>
  );
}

function StepHeading({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <h2 className="inline-flex items-center gap-2 border-b border-[var(--octo-border-card)] pb-2 text-[15px] font-semibold text-[var(--octo-text-primary)]">
      {icon}
      {text}
    </h2>
  );
}

function FooterButton({
  tone,
  disabled,
  title,
  onClick,
  children,
}: {
  tone: "grey" | "soft" | "primary";
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
        tone === "grey" && "bg-[var(--octo-track)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]",
        tone === "soft" && "bg-[#0D6EFD]/[0.07] text-[#0D6EFD] hover:bg-[#0D6EFD]/[0.12] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]",
        tone === "primary" && "bg-[#0D6EFD] text-white hover:opacity-90"
      )}
    >
      {children}
    </button>
  );
}
