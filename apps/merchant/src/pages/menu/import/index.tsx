// The AI branch's landing page.
//
// Three controls point here — the library header's "Import Menu (AI)", the
// chooser's green card, and later the wizard's method switch. The page exists
// so that none of them is a dead button: the frames promise this capability,
// and a page that explains the wait keeps that promise better than a disabled
// control, which reads as a broken build rather than as a roadmap.
//
// Deliberately a page, not a modal or a toast. A merchant who clicked something
// that looked like a primary action deserves something that stays put while
// they read it, and a back button that works.
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PencilRuler, Sparkles } from "lucide-react";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { UPLOAD_WITH_AI_ART } from "@/shared/lib/menu-assets";

export function ImportMenuPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header>
        <h1 className="text-[22px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuImport.title")}
        </h1>
        <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">
          {t("menuImport.subtitle")}
        </p>
      </header>

      <section className="mx-auto mt-6 max-w-[560px] rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-8 text-center">
        <img src={UPLOAD_WITH_AI_ART} alt="" className="mx-auto h-[200px] object-contain" />

        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--octo-track)] px-3 py-1 text-[13px] font-medium text-[var(--octo-text-secondary)]">
          <Sparkles size={14} aria-hidden />
          {t("menuImport.soonTitle")}
        </p>

        <p className="mx-auto mt-3 max-w-[420px] text-[14px] leading-relaxed text-[var(--octo-text-secondary)]">
          {t("menuImport.soonBody")}
        </p>

        <div className="mt-6 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
          <Button
            onClick={() => navigate("/menu/new/scratch")}
            icon={<PencilRuler size={16} aria-hidden />}
          >
            {t("menuImport.buildByHand")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/menu")}
            icon={<ArrowLeft size={16} className="rtl:rotate-180" aria-hidden />}
          >
            {t("menuImport.backToMenus")}
          </Button>
        </div>
      </section>
    </div>
  );
}
