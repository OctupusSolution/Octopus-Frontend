// Add a reservation: a full page rather than the old dialog, in two steps —
// the reservation and guest details, then the table on the floor plan. The
// fields are the same ones the Edit dialog uses (_shared/reservation-form).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight, Calendar, Send, User } from "lucide-react";
import { createBooking } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useBookings, useFloorPlan } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import { FLOOR_PLAN_BUILDER_PATH } from "@/pages/reservations/floor-plan/_shared/paths";
import { applyFormSubmit } from "../_shared/model";
import { RESERVATIONS_PATH } from "../_shared/paths";
import { useReservationActions } from "../_shared/reservations-store";
import { describeReservationError, isSlotTakenError, verifyTableAvailable, type AlternativeSlot } from "../_shared/reservations-api";
import { AlternativesPicker, type AlternativesState } from "../_shared/alternatives-picker";
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
  const { activeBusinessId } = useAuth();
  const actions = useReservationActions();
  const [saveError, setSaveError] = useState<string | null>(null);
  // Set when the server refuses the chosen time on the chosen table; offers
  // the nearest free times on that same table instead of a dead end.
  const [alternatives, setAlternatives] = useState<AlternativesState | null>(null);
  const { addBooking } = useBookings();
  const { published } = useFloorPlan();
  // A sample layout only exists to preview the builder — a host must not be
  // able to seat a real guest against tables that aren't actually on the floor.
  const hasFloorPlan = published !== null;

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
  // the one before it has what it needs. The table step also needs a real,
  // published floor plan — without one there is nothing real to seat against.
  const maxReachable: Step = !canSavePending ? 1 : !canConfirm ? 2 : hasFloorPlan ? 3 : 2;

  function goToStep(next: number) {
    if (next > maxReachable) return;
    setStep(next as Step);
    window.scrollTo({ top: 0 });
  }

  function save(intent: "pending" | "confirm") {
    const withTable: DraftState =
      tableReady && selected ? { ...draft, table: selected.table.number, area: selected.zoneName ?? draft.area } : draft;
    const reservation = buildReservation(withTable, "add", null, intent);
    setSaveError(null);
    setAlternatives(null);

    function finish() {
      actions
        .create({ draft: reservation, intent, resourceId: tableReady && selected ? selected.table.id : null })
        .then(() => {
          // Book the table on the floor plan too, so Floor Plan shows it reserved.
          if (tableReady && selected) addBooking(createBooking(selected.table.id, picking.at, draft.partySize, reservation.guest));
          navigate(RESERVATIONS_PATH);
        })
        .catch((err) => {
          if (isSlotTakenError(err)) offerAlternatives();
          else setSaveError(describeReservationError(err));
        });
    }

    function offerAlternatives() {
      if (!selected) return;
      setAlternatives({ kind: "loading" });
      actions
        .alternatives(
          { date: draft.date, time: draft.time, partySize: draft.partySize, durationMinutes: draft.durationMinutes },
          { resourceId: selected.table.id }
        )
        .then((slots) => setAlternatives({ kind: "ready", slots }))
        .catch(() => setAlternatives({ kind: "error" }));
    }

    // The grid's own colours come from the floor plan's local snapshot of
    // its bookings, which can be a beat behind another host's own session —
    // this is the server's real answer, asked once, right before the
    // booking that would actually double the table up.
    if (tableReady && selected && activeBusinessId) {
      verifyTableAvailable(activeBusinessId, selected.table.id, {
        date: draft.date,
        time: draft.time,
        partySize: draft.partySize,
        durationMinutes: draft.durationMinutes,
      })
        .then((free) => {
          if (!free) {
            // The table stays selected so the nearest free times on it can be
            // offered; picking another table on the grid still works too.
            offerAlternatives();
            return;
          }
          finish();
        })
        .catch((err) => setSaveError(describeReservationError(err)));
    } else {
      finish();
    }
  }

  function pickAlternative(slot: AlternativeSlot) {
    setDraft((prev) => ({ ...prev, date: slot.date, time: slot.minutes }));
    setAlternatives(null);
  }

  const nextEnabled = step === 1 ? canSavePending : step === 2 ? canConfirm && hasFloorPlan : canConfirm;

  return (
    <div className="px-4 pb-10 pt-5 sm:px-8 sm:pt-7">
      {saveError && (
        <div role="alert" className="mb-4 rounded-[10px] bg-error/10 px-4 py-2.5 text-[13px] text-error">
          {saveError}
        </div>
      )}
      {alternatives && (
        <div className="mb-4">
          <AlternativesPicker state={alternatives} onPick={pickAlternative} />
        </div>
      )}
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
          {!hasFloorPlan && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning/10 px-4 py-3 text-[12.5px] text-warning">
              <span>{t("reservations.new.noFloorPlan")}</span>
              <button
                type="button"
                onClick={() => navigate(FLOOR_PLAN_BUILDER_PATH)}
                className="shrink-0 rounded-[9px] border border-warning/40 bg-[var(--octo-card)] px-3 py-1.5 font-medium text-warning transition-colors hover:bg-warning/10"
              >
                {t("reservations.new.buildFloorPlan")}
              </button>
            </div>
          )}
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
        {/* The API books every reservation on a table (or table group), pending
            ones included, so saving waits for the table step. */}
        <FooterButton
          tone="soft"
          disabled={!canSavePending || !tableReady}
          title={tableReady ? undefined : t(hasFloorPlan ? "reservations.table.needsTable" : "reservations.new.noFloorPlan")}
          onClick={() => save("pending")}
        >
          {t("reservations.form.saveAsPending")}
        </FooterButton>
        {step < 3 ? (
          <FooterButton
            tone="primary"
            disabled={!nextEnabled}
            title={nextEnabled ? undefined : step === 2 && canConfirm && !hasFloorPlan ? t("reservations.new.noFloorPlan") : t("reservations.new.nextNeeds")}
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
