// Step 6 of the builder: a private rehearsal of the customer journey before
// publishing. Drawn to the Figma "Public Link-step 5-preview" frames: before a
// run, two columns (the "Test Mode" card with its numbered checklist, and the
// Live Preview); once a run has finished, three (test mode, the results table
// with the performance score, the preview with its test-mode address) — plus
// one full-width "Invite Testers" card underneath.
import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { previewModelFromSite } from "../_shared/preview-model";
import { resultsFor, SIM_STEPS } from "../_shared/simulation";
import type { SiteAction, Tester } from "../_shared/site-draft";
import type { StepProps } from "../_shared/steps";
import { usePlText } from "../_shared/texts";
import { rules, useTouched, useValidation, type Rule } from "../_shared/validation";
import { PlButton, PlField, PlFieldError, PlIcon, PlInput, PlSelect, plFieldClass, plPanel, plText } from "../ui/kit";
import { QrCode } from "../ui/qr-code";
import { SitePreview } from "../ui/site-preview";
import { Switch } from "../ui/switch";
import { PreviewLinksCard } from "./connected/preview-links-card";

const COPY_RESET_MS = 2000;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 4;
const PASSWORD_MAX = 64;

/** The frames' 12px-radius panel with its 12/16 padding and 16px rhythm. */
const PANEL = clsx(plPanel, "flex min-w-0 flex-col gap-4 px-3 py-4");
/** 12px/1.3 medium muted copy under a panel title. */
const PANEL_NOTE = "text-[12px] font-medium leading-[1.3] text-[var(--pl-text-2)]";

/** The green "● Success" / "● Tested" pill. */
function SuccessBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#dcffef] px-2 py-1 text-[12px] font-medium leading-[12px] text-[#009a39]">
      <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-[#009a39]" />
      {children}
    </span>
  );
}

/** Module scope, not nested inside `PreviewStep`: a component redefined on
 *  every render would remount every row, resetting whatever transition/focus
 *  state a merchant is mid-interaction with elsewhere on the page. */
function ChecklistRow({ index, label, note, active }: { index: number; label: string; note: string; active: boolean }) {
  return (
    <li className="relative flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--pl-primary-soft)] text-[12px] font-semibold leading-[12px] text-[var(--pl-primary)]">
          {index + 1}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="truncate text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">{label}</span>
          <span className="truncate text-[12px] font-medium leading-[12px] text-[var(--pl-text-2)]">{note}</span>
        </div>
      </div>
      <PlIcon
        name="preview-check-solid"
        className={clsx("text-[var(--pl-primary)] transition-opacity", !active && "opacity-30")}
      />
    </li>
  );
}

function TesterRow({ tester, t }: { tester: Tester; t: (key: string) => string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--pl-primary-soft)] text-[var(--pl-text)]">
          <PlIcon name="preview-user" size={16} />
        </span>
        <span className="truncate text-[16px] font-medium leading-[16px] text-[var(--pl-text)]" dir="ltr">
          {tester.email}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-6">
        <span className="whitespace-nowrap text-[12px] font-medium leading-[12px] text-[var(--pl-text)]">{t(tester.roleKey)}</span>
        {tester.tested && <SuccessBadge>{t("publicLink.preview.tested")}</SuccessBadge>}
      </div>
    </li>
  );
}

const EXPIRY_OPTIONS = ["1", "7", "30"] as const;

/** Where "Test Mode Settings" leads: how long the private preview link lives
 *  and whether it asks for a password. Edits a local copy so Cancel really
 *  discards them. */
function TestModeSettingsModal({
  open,
  onClose,
  settings,
  dispatch,
  connected = false,
}: {
  open: boolean;
  onClose: () => void;
  settings: StepProps["draft"]["preview"]["testModeSettings"];
  dispatch: (action: SiteAction) => void;
  /** Real preview links have no password; only expiry applies. */
  connected?: boolean;
}) {
  const tx = usePlText();
  const { t } = useI18n();
  const { check } = useValidation();
  const { touched, touch, reset } = useTouched();
  const [local, setLocal] = useState(settings);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLocal(settings);
      reset();
    }
  }, [open, settings, reset]);

  const needsPassword = !connected && local.requirePassword;
  const passwordError = needsPassword
    ? check(local.password, [rules.required(), rules.minLength(PASSWORD_MIN), rules.maxLength(PASSWORD_MAX)])
    : undefined;
  const expiryError = (EXPIRY_OPTIONS as readonly string[]).includes(local.expiresInDays) ? undefined : tx("pl.v.required");

  function save() {
    if (expiryError) return;
    if (passwordError) {
      touch("password");
      passwordRef.current?.focus();
      return;
    }
    dispatch({ type: "patchTestMode", patch: local });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("publicLink.preview.settings.title")}
      footer={
        <div className="flex justify-end gap-2">
          <PlButton variant="neutral" size="md" onClick={onClose}>
            {t("common.cancel")}
          </PlButton>
          <PlButton size="md" onClick={save}>
            {t("common.save")}
          </PlButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <PlField label={t("publicLink.preview.settings.expires")} hint={t("publicLink.preview.settings.expiresNote")} error={expiryError}>
          <PlSelect
            aria-label={t("publicLink.preview.settings.expires")}
            invalid={Boolean(expiryError)}
            value={local.expiresInDays}
            onChange={(e) => setLocal({ ...local, expiresInDays: e.target.value as (typeof EXPIRY_OPTIONS)[number] })}
          >
            {EXPIRY_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {t(`publicLink.preview.settings.expires.${days}`)}
              </option>
            ))}
          </PlSelect>
        </PlField>
        {connected ? (
          <p className={plText.hint}>{tx("pl.preview.noPassword")}</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <span className={plText.h6}>{t("publicLink.preview.settings.requirePassword")}</span>
                <span className={plText.hint}>{t("publicLink.preview.settings.requirePasswordNote")}</span>
              </div>
              <Switch
                checked={local.requirePassword}
                onChange={() => setLocal({ ...local, requirePassword: !local.requirePassword })}
                label={t("publicLink.preview.settings.requirePassword")}
              />
            </div>
            {local.requirePassword && (
              <PlField label={t("publicLink.preview.settings.password")} required error={touched("password") ? passwordError : undefined}>
                <PlInput
                  ref={passwordRef}
                  type="password"
                  autoComplete="new-password"
                  aria-label={t("publicLink.preview.settings.password")}
                  placeholder={t("publicLink.preview.settings.passwordPlaceholder")}
                  invalid={touched("password") && Boolean(passwordError)}
                  value={local.password}
                  onChange={(e) => setLocal({ ...local, password: e.target.value })}
                  onBlur={() => touch("password")}
                />
              </PlField>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

const SCORE_CHECKS = ["noBrokenLinks", "formsWorking", "paymentsWorking", "notificationsWorking"] as const;
/** Step · Status · Time · Details — one template so header and rows line up. */
const RESULT_COLUMNS = "grid grid-cols-[minmax(0,140px)_80px_44px_minmax(0,1fr)] items-center gap-x-6";

export function PreviewStep({ draft, dispatch, publicLinkSync }: StepProps) {
  const { t, locale } = useI18n();
  const tx = usePlText();
  const { user } = useAuth();
  const { check } = useValidation();
  const { touched, touch, reset } = useTouched();
  const emailErrorId = useId();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Desktop, like every other step. Opening this one on `mobile` rendered a
  // 300px phone inside a much wider column, which read as a broken layout
  // rather than a deliberate device choice.
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [canView, setCanView] = useState(true);
  const emailRef = useRef<HTMLInputElement>(null);

  const { preview } = draft;
  const model = previewModelFromSite(draft, device, t, locale);
  const previewUrl = `https://${model.url}?preview=test`;

  // The rehearsal runner: keyed only on `simulation`, so it fires once per
  // Start press rather than once per tick. It schedules its own chain of
  // timeouts (one per SIM_STEPS entry) and clears them on cleanup — a
  // merchant who navigates away mid-run must not leave a timer dispatching
  // into an unmounted tree.
  useEffect(() => {
    if (preview.simulation !== "running") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const advance = (step: number) => {
      if (cancelled) return;
      if (step >= SIM_STEPS.length) {
        dispatch({ type: "patchPreview", patch: { simulation: "done", results: resultsFor(SIM_STEPS.length) } });
        return;
      }
      timer = setTimeout(() => {
        if (cancelled) return;
        dispatch({ type: "patchPreview", patch: { completed: step + 1 } });
        advance(step + 1);
      }, SIM_STEPS[step].seconds * 1000);
    };

    advance(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.simulation]);

  function toggleRun() {
    if (preview.simulation === "running") {
      dispatch({ type: "patchPreview", patch: { simulation: "idle", completed: 0, results: null } });
    } else {
      dispatch({ type: "patchPreview", patch: { simulation: "running", completed: 0, results: null } });
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      // Clipboard access can be unavailable (e.g. over plain http, or a
      // browser that blocks it) — the copy simply doesn't happen.
    }
  }

  // Invite-tester email: required, a real address, within the 254-character
  // limit of an address, and not someone already on the list (the owner
  // included) — compared case-insensitively, as mailboxes are.
  const ownerEmail = user?.email ?? "";
  const invited = [ownerEmail, ...preview.testers.map((tester) => tester.email)].map((value) => value.trim().toLowerCase()).filter(Boolean);
  const notInvited: Rule = (value) => (invited.includes(value.trim().toLowerCase()) ? { key: "pl.v.duplicate" } : null);
  const emailFailure = check(email, [rules.required(), rules.maxLength(EMAIL_MAX), rules.email(), notInvited]);
  const emailError = touched("email") ? emailFailure : undefined;

  function sendInvitation() {
    if (emailFailure) {
      touch("email");
      emailRef.current?.focus();
      return;
    }
    const tester: Tester = { email: email.trim(), roleKey: "publicLink.preview.tester", canView, tested: false };
    dispatch({ type: "patchPreview", patch: { testers: [...preview.testers, tester] } });
    setEmail("");
    reset();
  }

  const running = preview.simulation === "running";
  // The rehearsal is a scripted walkthrough, not a test of the real site: connected, the live
  // preview beside it and the real preview links replace it, so it is not offered.
  const rehearsal = !publicLinkSync.connected;
  const done = rehearsal && preview.results !== null;
  const successCount = preview.results?.filter((r) => r.status === "success").length ?? 0;
  const score = done ? Math.round((successCount / SIM_STEPS.length) * 100) : 0;
  const testerCount = preview.testers.length + 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Before a run the results column has nothing to show, so it isn't
          reserved at all — two columns (test-mode panel + Live Preview), as
          the idle frame draws it. Once a run finishes, the results table
          claims a real middle column and the layout grows to three (the
          frame's 269 / 519 / 312 split). */}
      <div
        className={clsx(
          "grid items-start gap-6",
          done ? "xl:grid-cols-[269px_minmax(0,519fr)_minmax(0,312fr)]" : "xl:grid-cols-[minmax(0,464px)_minmax(0,660fr)]"
        )}
      >
        {/* Start: test-mode status + rehearsal checklist */}
        <div className={PANEL}>
          {!done && <p className={plText.h5}>{t("publicLink.customize.selectedSection")}</p>}
          {rehearsal ? (
            <div className="flex flex-col gap-2">
              <p className={plText.h6}>1- {t("publicLink.preview.testMode")}</p>
              <p className={PANEL_NOTE}>{t("publicLink.preview.testModeNote")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className={plText.h6}>{t("publicLink.live.previewTitle")}</p>
              <p className={PANEL_NOTE}>{t("publicLink.live.previewNote")}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {rehearsal && (
              // The frame's status pill. It is also the test-mode switch the
              // step always had: pressing it turns test mode off and on.
              <button
                type="button"
                role="switch"
                aria-checked={preview.testMode}
                aria-label={t("publicLink.preview.testMode")}
                onClick={() => dispatch({ type: "patchPreview", patch: { testMode: !preview.testMode } })}
                className={clsx(
                  "flex w-full items-center justify-center gap-1 rounded-[12px] border border-[var(--pl-g300)] p-2 text-[12px] font-medium leading-[12px] transition-colors hover:bg-[var(--pl-g50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                  preview.testMode ? "text-[var(--pl-success)]" : "text-[var(--pl-text-2)]"
                )}
              >
                <PlIcon name="completed" size={16} className={clsx(!preview.testMode && "opacity-40")} />
                {preview.testMode ? t("publicLink.preview.testModeOn") : tx("pl.preview.testModeOff")}
              </button>
            )}
            <PlButton variant="soft" size="md" className="w-full !text-[var(--pl-primary-deep)]" onClick={() => setSettingsOpen(true)}>
              {t("publicLink.preview.testModeSetting")}
            </PlButton>
            {!rehearsal && (
              <p className={plText.hint}>{t(`publicLink.preview.settings.expires.${preview.testModeSettings.expiresInDays}`)}</p>
            )}
          </div>

          {rehearsal && (
            <>
              <ol className="relative flex flex-col gap-4">
                {/* The rail the numbers sit on: 1px, from the first circle to the last. */}
                <span aria-hidden className="absolute bottom-3 start-3 top-2 w-px bg-[var(--pl-primary)]" />
                {SIM_STEPS.map((step, index) => (
                  <ChecklistRow
                    key={step.id}
                    index={index}
                    label={t(step.labelKey)}
                    note={t(step.noteKey)}
                    active={index < preview.completed}
                  />
                ))}
              </ol>

              <PlButton size="md" className="w-full" onClick={toggleRun}>
                {running ? t("publicLink.preview.endSimulation") : t("publicLink.preview.startSimulation")}
              </PlButton>
            </>
          )}
        </div>

        {/* Middle: results — the column itself only exists once a run has
            completed; before that there is nothing to reserve it for, so the
            grid template above drops straight to two columns instead of
            leaving this one flexible-and-empty. */}
        {done && preview.results ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div className={PANEL}>
              <div className="flex flex-col gap-2">
                <p className={plText.h6}>2- {t("publicLink.preview.simulationResults")}</p>
                <p className={PANEL_NOTE}>{tx("pl.preview.allCompleted")}</p>
              </div>
              <div className="overflow-x-auto rounded-[12px] border border-[var(--pl-g300)] p-3">
                <div role="table" aria-label={t("publicLink.preview.simulationResults")} className="flex min-w-[440px] flex-col gap-4">
                  <div
                    role="row"
                    className={clsx(RESULT_COLUMNS, "h-6 bg-[var(--pl-g100)] px-3 text-[12px] font-medium leading-[12px] text-[var(--pl-text)]")}
                  >
                    <span role="columnheader" className="ps-3">
                      {t("publicLink.preview.step")}
                    </span>
                    <span role="columnheader" className="text-center">
                      {t("publicLink.preview.status")}
                    </span>
                    <span role="columnheader" className="text-center">
                      {t("publicLink.preview.time")}
                    </span>
                    <span role="columnheader" className="ps-8">
                      {t("publicLink.preview.details")}
                    </span>
                  </div>
                  <div role="rowgroup" className="flex flex-col gap-4">
                    {preview.results.map((result) => {
                      const step = SIM_STEPS.find((s) => s.id === result.stepId);
                      return (
                        <div key={result.stepId} role="row" className={clsx(RESULT_COLUMNS, "border-b border-[var(--pl-g300)] pb-2")}>
                          <span role="cell" className="text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">
                            {step ? t(step.labelKey) : result.stepId}
                          </span>
                          <span role="cell" className="flex justify-center">
                            <SuccessBadge>{t("publicLink.preview.success")}</SuccessBadge>
                          </span>
                          <span role="cell" className="text-center text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">
                            {result.seconds.toFixed(1)}s
                          </span>
                          <span role="cell" className="text-[12px] font-medium leading-[1.2] text-[var(--pl-text-2)]">
                            {t(result.detailKey)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-[140px] flex-col justify-center gap-3 rounded-[8px] bg-[var(--pl-info-bg)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1">
                  <PlIcon name="preview-check-solid" className="text-[var(--pl-primary)]" />
                  <p className="text-[14px] font-medium leading-[14px] text-[var(--pl-primary-deep)]">{t("publicLink.preview.performanceScore")}</p>
                </div>
                <p className="whitespace-nowrap font-bold text-[var(--pl-primary-deep)]" dir="ltr">
                  <span className="text-[16px] leading-[16px]">{score}/</span>
                  <span className="text-[10px] font-medium leading-[10px]">100</span>
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {SCORE_CHECKS.map((key) => (
                  <li key={key} className="flex items-center gap-1 text-[12px] font-normal leading-[12px] text-[var(--pl-text)]">
                    <PlIcon name="preview-done-outlined" size={16} className="text-[var(--pl-primary)]" />
                    {t(`publicLink.preview.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* End: device preview and the share link */}
        <div className="flex min-w-0 flex-col gap-4">
          {publicLinkSync.connected ? (
            <PreviewLinksCard sync={publicLinkSync} expiresInDays={Number(preview.testModeSettings.expiresInDays) || 7} />
          ) : (
            <div className={clsx(PANEL, "!gap-3")}>
              <p className="font-medium text-[var(--pl-text)]">
                <span className="text-[14px] leading-[14px]">{tx("pl.preview.urlLabel")} </span>
                <span className="text-[10px] leading-[10px]">{tx("pl.preview.urlMode")}</span>
              </p>
              <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--pl-g300)] bg-[var(--pl-primary-soft)] px-3 py-2">
                <span
                  className="min-w-0 flex-1 truncate text-start text-[14px] font-semibold leading-[1.4] text-[var(--pl-primary)] underline"
                  dir="ltr"
                  title={previewUrl}
                >
                  {previewUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={t("publicLink.preview.copyLink")}
                  title={copied ? t("publicLink.preview.copied") : t("publicLink.preview.copyLink")}
                  className={clsx(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-[4px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                    copied ? "text-[var(--pl-success)]" : "text-[var(--pl-primary)]"
                  )}
                >
                  <PlIcon name={copied ? "completed" : "preview-copy"} />
                </button>
                <span role="status" className="sr-only">
                  {copied ? t("publicLink.preview.copied") : ""}
                </span>
              </div>
              <QrCode value={previewUrl} size={88} />
            </div>
          )}

          <SitePreview draft={draft} dispatch={dispatch} sync={publicLinkSync} device={device} onDevice={setDevice} height={640} />
        </div>
      </div>

      {/* Invite Testers */}
      <div className="flex flex-col gap-6 rounded-[28px] bg-[var(--pl-surface)] p-6 shadow-[shadow:var(--pl-shadow-raised)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-[24px] font-bold leading-[24px] text-[var(--pl-text)]">{t("publicLink.preview.inviteTesters")}</p>
            <p className="text-[16px] font-normal leading-[1.5] text-[var(--pl-text-3)]">{tx("pl.preview.inviteNote")}</p>
          </div>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-3">
              <span className="px-2 text-[16px] font-medium leading-[16px] text-[var(--pl-text)]">
                {t("publicLink.preview.email")}
                <span className="text-[var(--pl-error)]"> *</span>
              </span>
              <span className="relative flex items-center">
                <span className="pointer-events-none absolute start-2 flex items-center text-[var(--pl-text-2)]">
                  <PlIcon name="preview-mail" />
                </span>
                <input
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  placeholder={tx("pl.preview.emailPlaceholder")}
                  value={email}
                  aria-invalid={Boolean(emailError) || undefined}
                  aria-describedby={emailError ? emailErrorId : undefined}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => touch("email")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendInvitation();
                    }
                  }}
                  // The address is typed left-to-right, but the icon sits on the page's start side: the
                  // room for it is therefore physical (left in LTR pages, right in RTL ones), not `ps-`,
                  // which inside this LTR field would always mean left.
                  className={plFieldClass(Boolean(emailError), "h-14 !pl-10 !pr-2 [[dir=rtl]_&]:!pl-2 [[dir=rtl]_&]:!pr-10 [[dir=rtl]_&]:text-right")}
                />
              </span>
              <PlFieldError id={emailErrorId}>{emailError}</PlFieldError>
            </label>

            {/* A field-shaped toggle, level with the email input (below its label row). */}
            <div className="flex h-14 min-w-0 items-center justify-between gap-3 rounded-[12px] border border-[var(--pl-g300)] px-3 py-2 md:mt-7">
              <span className="truncate text-[16px] font-medium leading-[16px] text-[var(--pl-text)]">{tx("pl.preview.canViewTest")}</span>
              <Switch checked={canView} onChange={() => setCanView(!canView)} label={tx("pl.preview.canViewTest")} />
            </div>
          </div>

          <PlButton size="md" className="w-full" onClick={sendInvitation}>
            {t("publicLink.preview.sendInvitation")}
          </PlButton>
        </div>

        <div className="flex flex-col gap-4">
          <p className="font-medium text-[var(--pl-text)]">
            <span className="text-[16px] leading-[16px]">{tx("pl.preview.testers")} </span>
            <span className="text-[14px] leading-[14px] text-[var(--pl-text-2)]">({testerCount})</span>
          </p>
          <ul className="flex flex-col gap-3">
            <TesterRow
              tester={{ email: user?.email ?? t("publicLink.preview.owner"), roleKey: "publicLink.preview.owner", canView: true, tested: true }}
              t={t}
            />
            {preview.testers.map((tester, index) => (
              <TesterRow key={`${tester.email}-${index}`} tester={tester} t={t} />
            ))}
          </ul>
        </div>
      </div>

      <TestModeSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={preview.testModeSettings}
        dispatch={dispatch}
        connected={publicLinkSync.connected}
      />
    </div>
  );
}
