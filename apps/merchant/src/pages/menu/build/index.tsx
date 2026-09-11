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
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import { SEED_BRANCHES, blankMenu, useMenuLibrary, type Menu } from "@/entities/menu";
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
  const { menus, setMenus } = useMenuLibrary();
  const [id] = useState(() => `m-${Date.now().toString(36)}`);
  const [created] = useState(() => blankMenu(id, SEED_BRANCHES[0].id, new Date().toISOString()));

  // Append once, on first render, so a re-render does not stack duplicates.
  const [seeded] = useState(() => {
    setMenus([...menus, created]);
    return true;
  });

  return seeded ? <Navigate to={`/menu/${id}/build/sections`} replace state={{ created: true }} /> : null;
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
  const { menus, setMenus } = useMenuLibrary();

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

  // No draft under this id — a refresh, or a link someone kept. Sending them to
  // the library is truer than an empty wizard claiming to edit something.
  if (!stored || !draft) return <Navigate to="/menu" replace />;

  const branchLabel =
    SEED_BRANCHES.find((b) => b.id === draft.branchId)?.label ?? draft.branchId;

  function goTo(n: number) {
    const next = WIZARD_STEPS[n - 1];
    if (!next) return;
    setFurthest((f) => Math.max(f, n));
    navigate(`/menu/${menuId}/build/${next}`);
  }

  function save(next?: Menu) {
    // Stamped here, the one place every save passes, so "Last Saved" and the
    // library's Recently Updated sort both tell the truth.
    const menu = { ...(next ?? draft!), updatedAt: new Date().toISOString() };
    setDraft(menu);
    setMenus(
      menus.some((m) => m.id === menu.id)
        ? menus.map((m) => (m.id === menu.id ? menu : m))
        : [...menus, menu]
    );
  }

  function saveAndLeave() {
    save();
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
