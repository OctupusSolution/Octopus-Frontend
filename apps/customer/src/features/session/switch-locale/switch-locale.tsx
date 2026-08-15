"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Segmented } from "@ui/primitives";
import type { Locale } from "@i18n/index";
import { LOCALE_COOKIE_NAME } from "@/shared/lib/locale-cookie-name";

const OPTIONS = [
  { id: "ar", label: "AR" },
  { id: "en", label: "EN" },
];

export interface SwitchLocaleProps {
  locale: Locale;
}

export function SwitchLocale({ locale }: SwitchLocaleProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleChange(next: string) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return <Segmented options={OPTIONS} value={locale} onChange={handleChange} />;
}
