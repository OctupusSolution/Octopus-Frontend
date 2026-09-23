// The wizard shell: four addresses, one draft, one set of chrome.
//
// app/routes/registry.tsx is a flat route list, so the four steps enter it as
// the single splat entry `/menu/:menuId/build/*` and this file renders a nested
// <Routes> beneath them. That keeps the step in the URL — browser-back walks the
// wizard instead of leaving it — without a second registry mechanism.
//
// The draft lives in memory (see the spec's Persistence section), so a step
// reached by refresh or by a pasted link finds no menu and redirects to /menu
// rather than rendering an empty wizard over a menu that is not there.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import { SEED_BRANCHES, blankMenu, saveBuilderStep, useMenuLibrary, type Menu } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { pullSections } from "@/entities/menu/menu-sync";
import { applyIds, pushMenu, type IdMap } from "@/entities/menu/menu-sync";
import { useI18n } from "@/app/providers/i18n-provider";
import { DraftProvider } from "./use-draft";
import { Stepper, WIZARD_STEPS, type WizardStep } from "./stepper";
import { WizardHeader } from "./wizard-header";
import { SectionsStep } from "./sections";
import { ItemsStep } from "./items";
import { ThemeStep } from "./theme";
import { ReviewStep } from "./review";

const TITLES: Record<WizardStep, { title: string; subtitle: string }> = {
  sections: { title: "menuWiz.sections.title", subtitle: "menuWiz.sections.subtitle" },
  items: { title: "menuWiz.items.title", subtitle: "menuWiz.items.subtitle" },
  theme: { title: "menuTheme.title", subtitle: "menuTheme.subtitle" },
  review: { title: "menuReview.title", subtitle: "menuReview.subtitle" },
};

/** `/menu/new/scratch` — the address the chooser's purple card and the import
 *  page's "build by hand" button both point at. It has no UI of its own: it
 *  creates the draft and hands over to the wizard. */
export function NewMenuRedirect() {
  const { create } = useMenuLibrary();
  const [target, setTarget] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create("New Menu")
      .then((m) => setTarget(m.id))
      .catch((err) => setFailed(err instanceof Error ? err.message : "error"));
  }, [create]);

  if (target) return <Navigate to={`/menu/${target}/build/sections`} replace state={{ created: true }} />;
  if (failed) return <p role="alert" className="p-6 text-error">{failed}</p>;
  return null;
}

/** The three footer weights the frames use: a grey quiet action, a tinted
 *  secondary one, and the solid step forward. */
function FooterButton({
  tone,
  onClick,
  disabled,
  children,
}: {
  tone: "quiet" | "tinted" | "primary";
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] px-4 text-[16px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "quiet" && "bg-[var(--octo-track)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]",
        tone === "tinted" && "bg-[var(--octo-selected)] text-[var(--octo-accent)] hover:brightness-95",
        tone === "primary" && "bg-[var(--octo-accent)] text-white hover:brightness-110"
      )}
    >
      {children}
    </button>
  );
}

export function MenuBuilderPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pathname, state } = useLocation();
  const { menuId } = useParams();
  const { menus, setMenus, replace } = useMenuLibrary();
  const { activeBusinessId } = useAuth();
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const syncedRef = useRef<Menu | null>(null);
  const idsRef = useRef<IdMap>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const stored = useMemo(() => menus.find((m) => m.id === menuId) ?? null, [menus, menuId]);
  const [draft, setDraft] = useState<Menu | null>(stored);
  // Only the scratch redirect marks a menu as new; opening one from the
  // library's Edit is editing, and the title should say so.
  const [isNew] = useState(() => Boolean((state as { created?: boolean } | null)?.created));
  const addAnother = useRef<(() => void) | null>(null);

  const step = (WIZARD_STEPS.find((s) => pathname.endsWith(`/${s}`)) ?? "sections") as WizardStep;
  const stepIndex = WIZARD_STEPS.indexOf(step) + 1;
  // A step opened by link has been reached, and so has everything before it.
  const [furthest, setFurthest] = useState(stepIndex);
  const [blocked, setBlocked] = useState<{ step: WizardStep; on: boolean }>({ step, on: false });
  // A block belongs to the step that raised it, so leaving that step lifts it.
  const nextBlocked = blocked.on && blocked.step === step;
  // Stable, and a no-op when nothing changed: steps call this from effects, so
  // a fresh function or a fresh state object each render would loop forever.
  const setNextBlocked = useCallback(
    (on: boolean) =>
      setBlocked((prev) => (prev.on === on && prev.step === step ? prev : { step, on })),
    [step]
  );

  // Pull the server's sections once per opened menu, so a reload shows what
  // was saved rather than the empty local shell.
  const pulled = useRef<string | null>(null);
  useEffect(() => {
    if (!activeBusinessId || !stored || pulled.current === stored.id) return;
    pulled.current = stored.id;
    pullSections(activeBusinessId, stored)
      .then((m) => {
        syncedRef.current = m;
        setDraft((d) => (d && d.id === m.id ? m : d));
        replace(m);
      })
      .catch((err) => setSaveError(err instanceof Error ? err.message : "error"));
  }, [activeBusinessId, stored, replace]);

  // Where the owner is in the builder, recorded server-side (PUT
  // builder-progress) each time a step opens. Losing it costs nothing the
  // merchant can see, so a failure is not worth an error banner.
  useEffect(() => {
    if (!activeBusinessId || !stored) return;
    saveBuilderStep(activeBusinessId, stored.id, step).catch(() => undefined);
  }, [activeBusinessId, stored?.id, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // No draft under this id — a refresh, or a link someone kept. Sending them to
  // the library is truer than an empty wizard claiming to edit something.
  if (!stored || !draft) return <Navigate to="/menu" replace />;

  const branchLabel =
    SEED_BRANCHES.find((b) => b.id === draft.branchId)?.label ?? draft.branchId;

  function goTo(n: number) {
    const next = WIZARD_STEPS[n - 1];
    if (!next) return;
    setFurthest((f) => Math.max(f, n));
    void save();
    navigate(`/menu/${menuId}/build/${next}`);
  }

  function save(next?: Menu) {
    // Stamped here, the one place every save passes, so "Last Saved" and the
    // library's Recently Updated sort both tell the truth.
    const menu = { ...(next ?? draft!), updatedAt: new Date().toISOString() };
    setDraft(menu);
    setSaveError(null);
    setMenus(menus.map((m) => (m.id === menu.id ? menu : m)));
    if (!activeBusinessId) return Promise.resolve();
    syncedRef.current ??= stored!;
    // Runs strictly one after another, and reads the baseline and id map at
    // run time, so a second save queued behind the first sees what it created.
    const run = pending.current.then(async () => {
      const res = await pushMenu(activeBusinessId, syncedRef.current!, applyIds(menu, idsRef.current));
      Object.assign(idsRef.current, res.ids);
      syncedRef.current = res.menu;
      return res;
    });
    pending.current = run.then(() => undefined, () => undefined);
    return run
      .then((res) => {
        // Fold ids and version into whatever the merchant has typed meanwhile,
        // rather than replacing the draft with the saved snapshot.
        setDraft((d) => (d ? { ...applyIds(d, res.ids, res.media), version: res.version } : d));
        replace({ ...applyIds(stored!, res.ids, res.media), version: res.version });
      })
      .catch((err) => setSaveError(err instanceof Error ? err.message : "error"));
  }

  async function saveAndLeave() {
    await save();
    navigate("/menu");
  }

  const next = (
    <FooterButton tone="primary" onClick={() => goTo(stepIndex + 1)} disabled={nextBlocked}>
      {t("menuWiz.nextStep")}
      <ArrowRight size={18} className="rtl:rotate-180" aria-hidden />
    </FooterButton>
  );

  const title = step === "sections" && !isNew ? "menuWiz.sections.editTitle" : TITLES[step].title;

  return (
    <DraftProvider value={{ draft, setDraft, save, addAnother, setNextBlocked }}>
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        <WizardHeader
          titleKey={title}
          subtitleKey={TITLES[step].subtitle}
          branchLabel={branchLabel}
          onChangeBranch={() => navigate("/settings/branches")}
        />

        {saveError && (
          <div role="alert" className="mt-3 rounded-[10px] bg-error/10 px-4 py-3 text-[14px] text-error">
            {saveError}
          </div>
        )}

        <Stepper current={stepIndex} furthest={furthest} onJump={goTo} />

        <div className="mt-5">
          <Routes>
            <Route index element={<Navigate to="sections" replace />} />
            <Route path="sections" element={<SectionsStep />} />
            <Route path="items" element={<ItemsStep />} />
            <Route path="theme" element={<ThemeStep />} />
            <Route path="review" element={<ReviewStep />} />
          </Routes>
        </div>

        {/* Each frame draws its own footer. Review has none: its publish card
            is the way forward, and a disabled Next Step there reads as broken. */}
        {step === "sections" && (
          <footer className="mt-5 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)_minmax(0,3.3fr)]">
            <FooterButton tone="quiet" onClick={() => navigate("/menu")}>{t("menuWiz.cancel")}</FooterButton>
            <FooterButton tone="tinted" onClick={saveAndLeave}>{t("menuWiz.saveDraft")}</FooterButton>
            {next}
          </footer>
        )}
        {step === "items" && (
          <footer className="mt-5 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)_minmax(0,3.3fr)]">
            <FooterButton tone="quiet" onClick={saveAndLeave}>{t("menuWiz.item.saveDraft")}</FooterButton>
            <FooterButton
              tone="tinted"
              onClick={() => {
                save();
                addAnother.current?.();
              }}
            >
              {t("menuWiz.item.saveAndAdd")}
            </FooterButton>
            {next}
          </footer>
        )}
        {step === "theme" && (
          <footer className="mt-5 grid gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <FooterButton tone="quiet" onClick={saveAndLeave}>{t("menuWiz.item.saveDraft")}</FooterButton>
            {next}
          </footer>
        )}
      </div>
    </DraftProvider>
  );
}
