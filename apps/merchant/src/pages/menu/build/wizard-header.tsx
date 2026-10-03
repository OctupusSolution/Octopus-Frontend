// Title, subtitle, and the two chips every build frame carries on the end side:
// today's date, and which branch the menu belongs to with a way to change it.
//
// Each step supplies its own title/subtitle pair, because the frames rename the
// page as you move through it — "Create New Menu from Scratch", then
// "Add& Configure Items", then "Menu Theme& Public Experience".
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { MenuIcon } from "../_shared/menu-icon";
import { PAGE_TITLE, SURFACE_SUBTLE, TEXT, TEXT_SECONDARY } from "../_shared/theme";

export function WizardHeader({
  titleKey,
  subtitleKey,
  branchLabel,
  onChangeBranch,
}: {
  titleKey: string;
  subtitleKey: string;
  branchLabel: string;
  onChangeBranch: () => void;
}) {
  const { t, locale } = useI18n();
  const today = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="flex min-h-[50px] flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-3">
        <h1 className={PAGE_TITLE}>{t(titleKey)}</h1>
        <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SECONDARY)}>{t(subtitleKey)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={clsx(
            "inline-flex h-10 items-center gap-2 rounded-[4px] p-2 text-[14px] font-medium leading-[14px] text-[#16161d] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]",
            SURFACE_SUBTLE
          )}
        >
          <MenuIcon name="menu-calendar.svg" size={24} />
          {today}
        </span>
        <span className={clsx("inline-flex h-10 items-center gap-6 rounded-[8px] p-2 text-[14px] leading-[14px]", SURFACE_SUBTLE, TEXT)}>
          <span className="inline-flex items-center gap-1 font-medium">
            <MenuIcon name="menu-location.svg" size={24} />
            {branchLabel}
          </span>
          <button type="button" onClick={onChangeBranch} className="font-bold text-[#0D6EFD] underline underline-offset-2">
            {t("menuWiz.changeBranch")}
          </button>
        </span>
      </div>
    </header>
  );
}
