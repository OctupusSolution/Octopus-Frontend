// The method chooser. Two cards, both live. The AI one leads to /menu/import
// rather than being dimmed or hidden: the frame promises the capability, and a
// page that explains the wait keeps that promise better than an inert button.
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, Coins, Info, MapPin, Store } from "lucide-react";
import { Button } from "@ui/primitives";
import { SEED_BRANCHES } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { CREATE_FROM_SCRATCH_ART, UPLOAD_WITH_AI_ART } from "@/shared/lib/menu-assets";

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <span className="text-[var(--octo-accent)]" aria-hidden>{icon}</span>
      <span>
        <span className="block text-[12px] text-[var(--octo-text-secondary)]">{label}</span>
        <span className="block text-[14px] font-semibold text-[var(--octo-text-primary)]">{value}</span>
      </span>
    </div>
  );
}

function Point({ children, tone }: { children: string; tone: string }) {
  return (
    <li className="flex items-start gap-2 text-[14px] text-[var(--octo-text-secondary)]">
      <CheckCircle2 size={18} className={`mt-px shrink-0 ${tone}`} aria-hidden />
      {children}
    </li>
  );
}

export function CreateMenuPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header>
        <h1 className="text-[22px] font-semibold text-[var(--octo-text-primary)]">{t("menuNew.title")}</h1>
        <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{t("menuNew.subtitle")}</p>
      </header>

      <div className="mt-4 grid divide-y divide-[var(--octo-border-card)] rounded-[12px] border border-[var(--octo-border-card)] sm:grid-cols-4 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
        <Fact icon={<Store size={18} />} label={t("menuNew.restaurant")} value="Ocean View Restaurant" />
        <Fact icon={<MapPin size={18} />} label={t("menuNew.branch")} value={SEED_BRANCHES[0].label} />
        <Fact icon={<Clock size={18} />} label={t("menuNew.timezone")} value="(GMT+03:00) ASIA/ RIYADH" />
        <Fact icon={<Coins size={18} />} label={t("menuNew.currency")} value="SAR (Saudi Riyal)" />
      </div>

      <div className="mx-auto mt-6 grid max-w-[1200px] gap-6 lg:grid-cols-2">
        <section className="relative rounded-[16px] border-2 border-[#7c3aed] bg-[#7c3aed]/5 p-6">
          <span className="absolute end-6 top-6 rounded-full bg-[#7c3aed] px-3 py-1 text-[13px] font-semibold text-white">
            {t("menuNew.recommended")}
          </span>
          <img src={CREATE_FROM_SCRATCH_ART} alt="" className="mx-auto h-[220px] object-contain" />
          <h2 className="mt-5 text-[20px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuNew.scratch.title")}
          </h2>
          <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">{t("menuNew.scratch.body")}</p>
          <ul className="mt-4 space-y-2.5">
            <Point tone="text-[#7c3aed]">{t("menuNew.scratch.p1")}</Point>
            <Point tone="text-[#7c3aed]">{t("menuNew.scratch.p2")}</Point>
            <Point tone="text-[#7c3aed]">{t("menuNew.scratch.p3")}</Point>
          </ul>
          <Button
            className="mt-5 w-full bg-[#7c3aed] hover:bg-[#6d28d9]"
            onClick={() => navigate("/menu/new/scratch")}
          >
            {t("menuNew.scratch.cta")}
          </Button>
        </section>

        <section className="rounded-[16px] border-2 border-[#16a34a] bg-[#16a34a]/5 p-6">
          <img src={UPLOAD_WITH_AI_ART} alt="" className="mx-auto h-[220px] object-contain" />
          <h2 className="mt-5 text-[20px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuNew.ai.title")}
          </h2>
          <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">{t("menuNew.ai.body")}</p>
          <ul className="mt-4 space-y-2.5">
            <Point tone="text-[#16a34a]">{t("menuNew.ai.p1")}</Point>
            <Point tone="text-[#16a34a]">{t("menuNew.ai.p2")}</Point>
            <Point tone="text-[#16a34a]">{t("menuNew.ai.p3")}</Point>
          </ul>
          <Button
            className="mt-5 w-full bg-[#16a34a] hover:bg-[#15803d]"
            onClick={() => navigate("/menu/import")}
          >
            {t("menuNew.ai.cta")}
          </Button>
        </section>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 rounded-[10px] bg-[var(--octo-hover)] px-4 py-3 text-[14px] text-[var(--octo-accent)]">
        <Info size={16} aria-hidden />
        {t("menuNew.switchHint")}
      </p>
    </div>
  );
}
