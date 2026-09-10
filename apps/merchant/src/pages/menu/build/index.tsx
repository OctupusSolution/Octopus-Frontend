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
import { useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@ui/primitives";
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

  return seeded ? <Navigate to={`/menu/${id}/build/sections`} replace /> : null;
}

export function MenuBuilderPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { menuId } = useParams();
  const { menus, setMenus } = useMenuLibrary();

  const stored = useMemo(() => menus.find((m) => m.id === menuId) ?? null, [menus, menuId]);
  const [draft, setDraft] = useState<Menu | null>(stored);
  const [furthest, setFurthest] = useState(1);

  // No draft under this id — a refresh, or a link someone kept. Sending them to
  // the library is truer than an empty wizard claiming to edit something.
  if (!stored || !draft) return <Navigate to="/menu" replace />;

  const step = (WIZARD_STEPS.find((s) => pathname.endsWith(`/${s}`)) ?? "sections") as WizardStep;
  const stepIndex = WIZARD_STEPS.indexOf(step) + 1;
  const branchLabel =
    SEED_BRANCHES.find((b) => b.id === draft.branchId)?.label ?? draft.branchId;

  function goTo(n: number) {
    const next = WIZARD_STEPS[n - 1];
    if (!next) return;
    setFurthest((f) => Math.max(f, n));
    navigate(`/menu/${menuId}/build/${next}`);
  }

  function save(next?: Menu) {
    const menu = next ?? draft!;
    setMenus(
      menus.some((m) => m.id === menu.id)
        ? menus.map((m) => (m.id === menu.id ? menu : m))
        : [...menus, menu]
    );
  }

  return (
    <DraftProvider value={{ draft, setDraft, save }}>
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        <WizardHeader
          titleKey={TITLES[step].title}
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

        <footer className="mt-5 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,2fr)]">
          <Button variant="secondary" onClick={() => navigate("/menu")}>
            {t("menuWiz.cancel")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              save();
              navigate("/menu");
            }}
          >
            {t("menuWiz.saveDraft")}
          </Button>
          <Button onClick={() => goTo(stepIndex + 1)} disabled={stepIndex === WIZARD_STEPS.length}>
            {t("menuWiz.nextStep")}
          </Button>
        </footer>
      </div>
    </DraftProvider>
  );
}
