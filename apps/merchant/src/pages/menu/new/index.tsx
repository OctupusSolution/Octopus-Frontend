// The method chooser (frame "ADD NEW MENU"). Two cards: from scratch opens the
// builder; upload with AI is drawn disabled as "Coming Soon" — the import flow
// stays reachable from the library header only.
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { SEED_BRANCHES } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { CREATE_FROM_SCRATCH_ART, UPLOAD_WITH_AI_ART, menuAsset } from "@/shared/lib/menu-assets";
import { MenuIcon } from "../_shared/menu-icon";
import { INFO_STRIP, LINE, PAGE_TITLE, SURFACE_BLUE, SURFACE_SUBTLE, TEXT, TEXT_GRAY, TEXT_SECONDARY } from "../_shared/theme";

const RESTAURANT_AVATAR = menuAsset("menu-restaurant-avatar.png");

const ICON_BLUE = "text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]";

function Fact({ icon, avatar, label, value, last }: { icon?: string; avatar?: string; label: string; value: string; last?: boolean }) {
  return (
    <div className={clsx("flex h-12 min-w-0 flex-1 items-center gap-2 p-2", !last && `border-b sm:border-b-0 sm:border-e ${LINE}`)}>
      {avatar ? (
        <img src={avatar} alt="" className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className={clsx("grid size-8 shrink-0 place-items-center rounded-full", SURFACE_BLUE, ICON_BLUE)}>
          {icon && <MenuIcon name={icon} size={24} />}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className={clsx("text-[12px] font-medium leading-3", TEXT_GRAY)}>{label}</span>
        <span className={clsx("truncate text-[14px] font-semibold leading-[14px]", TEXT)}>{value}</span>
      </span>
    </div>
  );
}

function Point({ children, tone }: { children: string; tone: string }) {
  return (
    <li className={clsx("flex items-center gap-1 text-[14px] font-medium leading-[14px]", TEXT)}>
      <MenuIcon name="menu-done-circle.svg" size={24} className={tone} />
      {children}
    </li>
  );
}

function MethodCard({
  tone,
  art,
  artWidth,
  badge,
  title,
  body,
  points,
  cta,
  onClick,
  disabled,
}: {
  tone: "violet" | "green";
  art: string;
  artWidth: number;
  badge?: string;
  title: string;
  body: string;
  points: string[];
  cta: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const violet = tone === "violet";
  return (
    <section
      className={clsx(
        "relative flex w-full max-w-[464px] flex-col gap-4 overflow-hidden rounded-[24px] border p-6",
        violet
          ? "border-[#6920d2] bg-[#f5f4fd] [[data-theme=dark]_&]:bg-[#6920d2]/10"
          : "border-[#009a39] bg-[#f3f8f5] [[data-theme=dark]_&]:bg-[#009a39]/10"
      )}
    >
      <div className="relative flex flex-col gap-6">
        <img src={art} alt="" style={{ width: artWidth }} className="h-[208px] max-w-full object-contain object-left rtl:object-right" />
        <div className="flex min-h-[169px] flex-col gap-3">
          <div className="flex min-h-[69px] flex-col gap-2">
            <h2 className={clsx("text-[20px] font-semibold leading-5", TEXT)}>{title}</h2>
            <p className={clsx("text-[14px] font-medium leading-[1.4]", TEXT_GRAY)}>{body}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {points.map((point) => (
              <Point key={point} tone={violet ? "text-[#6920d2] [[data-theme=dark]_&]:text-[#a78bfa]" : "text-[#009a39]"}>
                {point}
              </Point>
            ))}
          </ul>
        </div>
        {badge && (
          <span className="absolute end-0 top-0 rounded-full bg-[#6920d2] px-3 py-1 text-[16px] font-medium leading-4 text-white">
            {badge}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={clsx(
          "mt-auto flex h-10 w-full items-center justify-center rounded-[8px] px-3 text-[16px] font-bold leading-4 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
          violet ? "bg-[#6920d2] hover:opacity-90" : "bg-[#009a39]"
        )}
      >
        {cta}
      </button>
    </section>
  );
}

export function CreateMenuPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8">
      <header className="flex min-h-[50px] flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className={PAGE_TITLE}>{t("menuNew.title")}</h1>
          <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SECONDARY)}>{t("menuNew.subtitle")}</p>
        </div>
        <span
          className={clsx(
            "inline-flex items-center gap-2 rounded-[4px] p-2 text-[14px] font-medium leading-[14px] text-[#16161d] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]",
            SURFACE_SUBTLE
          )}
        >
          <MenuIcon name="menu-calendar.svg" size={24} />
          {today}
        </span>
      </header>

      <div className="flex flex-col gap-10">
        <div className={clsx("flex flex-col rounded-[8px] border sm:flex-row sm:gap-6", LINE)}>
          <Fact avatar={RESTAURANT_AVATAR} label={t("menuNew.restaurant")} value="Ocean View Restaurant" />
          <Fact icon="menu-location.svg" label={t("menuNew.branch")} value={SEED_BRANCHES[0].label} />
          <Fact icon="menu-clock.svg" label={t("menuNew.timezone")} value="(GMT+03:00) ASIA/ RIYADH" />
          <Fact icon="menu-money.svg" label={t("menuNew.currency")} value="SAR (Saudi Riyal)" last />
        </div>

        <div className="flex flex-col items-center gap-8">
          <div className="flex w-full flex-col items-center justify-center gap-6 lg:flex-row lg:items-stretch lg:gap-10">
            <MethodCard
              tone="violet"
              art={CREATE_FROM_SCRATCH_ART}
              artWidth={204}
              badge={t("menuNew.recommended")}
              title={t("menuNew.scratch.title")}
              body={t("menuNew.scratch.body")}
              points={[t("menuNew.scratch.p1"), t("menuNew.scratch.p2"), t("menuNew.scratch.p3")]}
              cta={t("menuNew.scratch.cta")}
              onClick={() => navigate("/menu/new/scratch")}
            />
            <MethodCard
              tone="green"
              art={UPLOAD_WITH_AI_ART}
              artWidth={308}
              title={t("menuNew.ai.title")}
              body={t("menuNew.ai.body")}
              points={[t("menuNew.ai.p1"), t("menuNew.ai.p2"), t("menuNew.ai.p3")]}
              cta={t("menuNew.ai.comingSoon")}
              disabled
            />
          </div>

          <p className={clsx("flex min-h-8 w-full items-center justify-center gap-1 rounded-[8px] px-3 py-1 text-center text-[14px] font-medium leading-[1.3]", INFO_STRIP)}>
            <MenuIcon name="menu-info-circle.svg" size={24} />
            {t("menuNew.switchHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
