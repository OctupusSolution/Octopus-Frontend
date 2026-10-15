// Add a reservation: a full page rather than the old dialog, in two steps —
// the reservation and guest details, then the table on the floor plan. The
// fields are the same ones the Edit dialog uses (_shared/reservation-form).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { createBooking } from "@/entities/floor-plan";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useBookings, useFloorPlan } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import { FLOOR_PLAN_BUILDER_PATH } from "@/pages/reservations/floor-plan/_shared/paths";
import { applyFormSubmit } from "../_shared/model";
import { RESERVATIONS_PATH } from "../_shared/paths";
import { BORDER_200, SURFACE_100, SURFACE_BRAND_LIGHT, TEXT_BRAND, TEXT_SEC_GRAY, TEXT_SECONDARY, TEXT_TITLE } from "../_shared/theme";
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
  const detailsReady = draft.date !== "" && draft.partySize > 0;

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

  // The reservation first, then the guest, then the table — the order the
  // frame's tabs open in. Each step opens once the one before it has what it
  // needs. The table step also needs a real, published floor plan — without
  // one there is nothing real to seat against.
  const maxReachable: Step = !detailsReady ? 1 : !canConfirm ? 2 : hasFloorPlan ? 3 : 2;

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

  const nextEnabled = step === 1 ? detailsReady : step === 2 ? canConfirm && hasFloorPlan : canConfirm;

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className={`text-[24px] font-bold leading-6 ${TEXT_TITLE}`}>
            {step === 3 ? t("reservations.table.title") : t("reservations.form.addTitle")}
          </h1>
          <p className={`text-[14px] font-medium leading-[14px] ${TEXT_SECONDARY}`}>
            {step === 3 ? t("reservations.table.subtitle") : t("reservations.subtitle")}
          </p>
        </div>
        {/* The frame's progress has two stops: the reservation and guest tabs
            share the first, the floor plan is the second. */}
        <Stepper
          step={step === 3 ? 2 : 1}
          labels={[t("reservations.form.tab.details"), t("reservations.new.stepTable")]}
          maxReachable={maxReachable === 3 ? 2 : 1}
          onStepClick={(n) => goToStep(n === 2 ? 3 : 1)}
        />
      </header>

      {step === 3 ? (
        <section className="mt-4">
          <SelectTableStep
            picking={picking}
            draft={draft}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEditDetails={() => goToStep(1)}
          />
        </section>
      ) : (
        <section className="mt-6 flex flex-col gap-6">
          <div role="tablist" className={`flex w-fit max-w-full items-center gap-6 border-b ${BORDER_200}`}>
            <FormTab
              active={step === 1}
              icon="form-calendar.svg"
              activeIcon="rsv-add-tab-calendar-bold.svg"
              text={t("reservations.form.tab.details")}
              onClick={() => goToStep(1)}
            />
            <FormTab
              active={step === 2}
              disabled={maxReachable < 2}
              icon="staff-user.svg"
              activeIcon="rsv-add-tab-user-bold.svg"
              text={t("reservations.form.tab.guest")}
              onClick={() => goToStep(2)}
            />
          </div>
          <div role="tabpanel" className="flex flex-col gap-3">
            {step === 2 ? (
              <GuestDetailsFields draft={draft} update={update} withNote />
            ) : (
              <ReservationDetailsFields
                mode="add"
                draft={draft}
                update={update}
                reservation={null}
                areaOptions={areaOptions}
                tableOptions={tableOptions}
              />
            )}
            {draft.depositEnabled && <LinkNotice />}
            {step === 2 && !hasFloorPlan && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-warning/10 px-3 py-2 text-[14px] font-medium leading-[1.3] text-warning">
                <span>{t("reservations.new.noFloorPlan")}</span>
                <button
                  type="button"
                  onClick={() => navigate(FLOOR_PLAN_BUILDER_PATH)}
                  className="shrink-0 rounded-[8px] border border-warning/40 bg-[var(--octo-card)] px-3 py-1.5 font-medium text-warning transition-colors hover:bg-warning/10"
                >
                  {t("reservations.new.buildFloorPlan")}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className={clsx("flex flex-col gap-3 sm:flex-row sm:gap-6", step === 3 ? "mt-6" : "mt-4")}>
        <FooterButton tone="grey" className="sm:w-[20.65%] sm:shrink-0" onClick={() => navigate(RESERVATIONS_PATH)}>
          {t("common.cancel")}
        </FooterButton>
        {/* The API books every reservation on a table (or table group), pending
            ones included, so saving waits for the table step. */}
        <FooterButton
          tone="soft"
          className="sm:min-w-0 sm:flex-1"
          disabled={!canSavePending || !tableReady}
          title={tableReady ? undefined : t(hasFloorPlan ? "reservations.table.needsTable" : "reservations.new.noFloorPlan")}
          onClick={() => save("pending")}
        >
          {t("reservations.form.saveAsPending")}
        </FooterButton>
        {step < 3 ? (
          <FooterButton
            tone="primary"
            className="sm:w-[calc(50%-12px)] sm:shrink-0"
            disabled={!nextEnabled}
            title={nextEnabled || step === 1 ? undefined : canConfirm && !hasFloorPlan ? t("reservations.new.noFloorPlan") : t("reservations.new.nextNeeds")}
            onClick={() => goToStep(step + 1)}
          >
            {t("reservations.new.next")}
            <ShellIcon name="arrow-right.svg" className="rtl:rotate-180" />
          </FooterButton>
        ) : (
          <FooterButton
            tone="primary"
            className="sm:w-[calc(50%-12px)] sm:shrink-0"
            disabled={!canConfirm || !tableReady}
            title={tableReady ? undefined : t("reservations.table.needsTable")}
            onClick={() => save("confirm")}
          >
            <ShellIcon name="rsv-add-send.svg" className="rtl:-scale-x-100" />
            {t("reservations.form.createAndSend")}
          </FooterButton>
        )}
      </footer>
    </div>
  );
}

/** One of the two tabs over the form. The active one takes the frame's solid
 *  icon and the blue underline; the grey line under both is the tab list's. */
function FormTab({
  active,
  disabled,
  title,
  icon,
  activeIcon,
  text,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  icon: string;
  activeIcon: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={clsx(
        "-mb-px inline-flex items-center gap-1 whitespace-nowrap border-b pb-3 pt-1 text-[14px] font-medium leading-[14px] transition-colors disabled:cursor-not-allowed",
        active ? `border-[#0d6efd] ${TEXT_BRAND}` : `border-transparent ${TEXT_SECONDARY}`
      )}
    >
      <ShellIcon name={active ? activeIcon : icon} />
      {text}
    </button>
  );
}

function FooterButton({
  tone,
  className,
  disabled,
  title,
  onClick,
  children,
}: {
  tone: "grey" | "soft" | "primary";
  className?: string;
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
        "inline-flex h-12 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-center text-[18px] font-bold leading-[18px] transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
        tone === "grey" && `${SURFACE_100} ${TEXT_SEC_GRAY} enabled:hover:opacity-85`,
        tone === "soft" && `${SURFACE_BRAND_LIGHT} ${TEXT_BRAND} enabled:hover:opacity-85`,
        tone === "primary" && "bg-[#0d6efd] text-white enabled:hover:opacity-90",
        className
      )}
    >
      {children}
    </button>
  );
}
