// Step 6 of the builder: a private rehearsal of the customer journey before
// publishing. Structurally three columns like customize-step.tsx — the
// checklist and its Start/End control on the start side, the results once a
// run has finished in the middle, and the device preview + QR share link on
// the end — plus one full-width card underneath for inviting testers.
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, QrCode as QrCodeIcon, Settings2 } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Input } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { previewModelFromSite } from "../_shared/preview-model";
import { resultsFor, SIM_STEPS } from "../_shared/simulation";
import type { SiteAction, Tester } from "../_shared/site-draft";
import { DeviceFrame } from "../ui/device-frame";
import { QrCode } from "../ui/qr-code";
import { Switch } from "../ui/switch";
import type { StepProps } from "../_shared/steps";

const COPY_RESET_MS = 2000;

/** Module scope, not nested inside `PreviewStep`: a component redefined on
 *  every render would remount every row, resetting whatever transition/focus
 *  state a merchant is mid-interaction with elsewhere on the page. */
function ChecklistRow({ index, label, note, active }: { index: number; label: string; note: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={clsx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          active ? "bg-[#0D6EFD] text-white" : "bg-[var(--octo-hover)] text-[var(--octo-text-faint)]"
        )}
      >
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12.5px] font-medium text-[var(--octo-text-primary)]">{label}</span>
        <span className="truncate text-[11px] text-[var(--octo-text-muted)]">{note}</span>
      </div>
      <CheckCircle2
        size={18}
        className={clsx("shrink-0", active ? "text-[#0D6EFD]" : "text-[var(--octo-text-faint)]")}
        fill={active ? "#0D6EFD" : "none"}
        stroke={active ? "white" : "currentColor"}
      />
    </div>
  );
}

function TesterRow({ tester, t }: { tester: Tester; t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[12.5px] font-medium text-[var(--octo-text-primary)]">{tester.email}</span>
        <span className="text-[11px] text-[var(--octo-text-muted)]">{t(tester.roleKey)}</span>
      </div>
      {tester.tested && <Badge tone="success">{t("publicLink.preview.tested")}</Badge>}
    </div>
  );
}

export function PreviewStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
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

  function sendInvitation() {
    if (!email.trim() || !email.includes("@")) {
      emailRef.current?.focus();
      return;
    }
    const tester: Tester = { email: email.trim(), roleKey: "publicLink.preview.tester", canView, tested: false };
    dispatch({ type: "patchPreview", patch: { testers: [...preview.testers, tester] } });
    setEmail("");
  }

  const running = preview.simulation === "running";
  const done = preview.results !== null;
  const successCount = preview.results?.filter((r) => r.status === "success").length ?? 0;
  const score = done ? Math.round((successCount / SIM_STEPS.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.stepTitle.preview")}</p>
      <p className="-mt-2 text-[12px] text-[var(--octo-text-muted)]">{t("publicLink.preview.subtitle")}</p>

      {/* Before a run the results column has nothing to show, so it isn't
          reserved at all — two columns (test-mode panel + Live Preview) rather
          than a flexible middle column sitting empty. Once a run finishes, the
          results table claims a real middle column and the layout grows to
          three.
          Both templates end in `minmax(0,1fr)` on purpose: two FIXED columns
          left the rest of a 1600px row blank, which is the same dead space
          this conditional exists to remove — it just moved it to the edge. */}
      <div className={clsx("grid gap-4", done ? "xl:grid-cols-[300px_460px_minmax(0,1fr)]" : "xl:grid-cols-[320px_minmax(0,1fr)]")}>
        {/* Start: test-mode status + rehearsal checklist */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.preview.testMode")}</span>
              <Switch
                checked={preview.testMode}
                onChange={() => dispatch({ type: "patchPreview", patch: { testMode: !preview.testMode } })}
                label={t("publicLink.preview.testMode")}
              />
            </div>
            <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.preview.testModeNote")}</p>
            {preview.testMode && (
              <Badge tone="info" className="w-fit">
                {t("publicLink.preview.testModeOn")}
              </Badge>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={<Settings2 size={13} />}
              onClick={() => dispatch({ type: "patchPreview", patch: { testMode: !preview.testMode } })}
            >
              {t("publicLink.preview.testModeSetting")}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {SIM_STEPS.map((step, index) => (
              <ChecklistRow
                key={step.id}
                index={index}
                label={t(step.labelKey)}
                note={t(step.noteKey)}
                active={index < preview.completed}
              />
            ))}
          </div>

          <Button variant={running ? "danger" : "primary"} onClick={toggleRun}>
            {running ? t("publicLink.preview.endSimulation") : t("publicLink.preview.startSimulation")}
          </Button>
        </div>

        {/* Middle: results — the column itself only exists once a run has
            completed; before that there is nothing to reserve it for, so the
            grid template above drops straight to two columns instead of
            leaving this one flexible-and-empty. */}
        {done && preview.results ? (
          <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.preview.simulationResults")}</p>
                  <Badge tone="success">{t("publicLink.preview.allStepsPassed")}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
                    <thead className="border-b border-[var(--octo-divider)]">
                      <tr>
                        <th className="px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                          {t("publicLink.preview.step")}
                        </th>
                        <th className="px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                          {t("publicLink.preview.status")}
                        </th>
                        <th className="px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                          {t("publicLink.preview.time")}
                        </th>
                        <th className="px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                          {t("publicLink.preview.details")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.results.map((result) => {
                        const step = SIM_STEPS.find((s) => s.id === result.stepId);
                        return (
                          <tr key={result.stepId} className="border-b border-[var(--octo-row-border)] last:border-0">
                            <td className="px-2 py-2.5 text-[12.5px] text-[var(--octo-text-primary)]">
                              {step ? t(step.labelKey) : result.stepId}
                            </td>
                            <td className="px-2 py-2.5">
                              <Badge tone="success">{t("publicLink.preview.success")}</Badge>
                            </td>
                            <td className="px-2 py-2.5 text-[12.5px] text-[var(--octo-text-muted)]">{result.seconds.toFixed(1)}s</td>
                            <td className="px-2 py-2.5 text-[12.5px] text-[var(--octo-text-muted)]">{t(result.detailKey)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.preview.performanceScore")}</p>
                  <span className="text-[20px] font-semibold text-[#16a34a]">{score}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["noBrokenLinks", "formsWorking", "paymentsWorking", "notificationsWorking"] as const).map((key) => (
                    <span key={key} className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-secondary)]">
                      <CheckCircle2 size={14} className="shrink-0 text-[#22C55E]" />
                      {t(`publicLink.preview.${key}`)}
                    </span>
                  ))}
                </div>
              </div>
          </div>
        ) : null}

        {/* End: device preview and the share QR/link */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("publicLink.preview.previewUrl")}
            </p>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--octo-text-primary)]">{previewUrl}</span>
              <Button size="sm" variant="secondary" icon={<Copy size={13} />} onClick={handleCopy}>
                {copied ? t("publicLink.preview.copied") : t("publicLink.preview.copyLink")}
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <QrCodeIcon size={13} className="shrink-0 text-[var(--octo-text-faint)]" />
              <QrCode value={previewUrl} size={88} />
            </div>
          </div>

          <DeviceFrame model={model} device={device} onDevice={setDevice} />
        </div>
      </div>

      {/* Invite Testers */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.preview.inviteTesters")}</p>
          <p className="text-[11.5px] text-[var(--octo-text-muted)]">{t("publicLink.preview.inviteNote")}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              ref={emailRef}
              label={t("publicLink.preview.email")}
              type="email"
              placeholder={t("publicLink.preview.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={canView} onChange={() => setCanView(!canView)} label={t("publicLink.preview.canViewTest")} />
            <span className="text-[12px] text-[var(--octo-text-secondary)]">{t("publicLink.preview.canViewTest")}</span>
          </div>
          <Button onClick={sendInvitation}>{t("publicLink.preview.sendInvitation")}</Button>
        </div>

        <div className="flex flex-col gap-2">
          <TesterRow tester={{ email: t("publicLink.preview.owner"), roleKey: "publicLink.preview.owner", canView: true, tested: true }} t={t} />
          {preview.testers.map((tester, index) => (
            <TesterRow key={`${tester.email}-${index}`} tester={tester} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
