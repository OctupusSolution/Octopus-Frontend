"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@i18n/index";
import { useI18n } from "@/app/providers";
import { LOCALE_COOKIE_NAME } from "@/shared/lib/locale-cookie-name";

export interface SwitchLocaleProps {
  locale: Locale;
  /** The languages the published site offers; omitted for the sample storefront (both). */
  languages?: string[];
  /** Builder canvas only: report the switch instead of setting the cookie and reloading. */
  onSwitch?: (language: string) => void;
}

/** One pill, not a segmented control: the design shows the *current* language
 *  and switching is a single toggle between the two the platform supports. */
export function SwitchLocale({ locale, languages, onSwitch }: SwitchLocaleProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  const offered = languages ?? ["ar", "en"];
  const next = offered.find((code) => code !== locale);

  // A site published in one language has nothing to switch to.
  if (!next) return null;

  function handleClick() {
    if (onSwitch) {
      onSwitch(next!);
      return;
    }
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-1.5 text-[12px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:opacity-60"
    >
      <Languages size={14} aria-hidden="true" />
      {t("store.nav.language")}
    </button>
  );
}
