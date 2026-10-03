import { PREVIEW_EXIT_PATH } from "@/shared/lib/preview";

// Local copy: the shared dictionaries (packages/i18n) have no strings for this yet.
const COPY = {
  en: { label: "Draft preview — not published", hint: "Only people with this private link can see this version.", exit: "Exit preview" },
  ar: { label: "معاينة مسودة — غير منشورة", hint: "لا يرى هذه النسخة إلا من يملك هذا الرابط الخاص.", exit: "إنهاء المعاينة" },
} as const;

/**
 * Shown on every page while a draft preview is rendered. It has no close button on purpose:
 * a visitor must always be able to tell a draft from the live site. Fixed to the bottom of
 * the viewport (the header is sticky at the top), with a spacer so it never covers the footer.
 */
export function PreviewBanner({ language, expiresAtUtc }: { language: string; expiresAtUtc?: string | null }) {
  const t = language === "ar" ? COPY.ar : COPY.en;
  return (
    <>
      <div aria-hidden className="h-14" />
      <div
        role="status"
        data-preview-banner
        lang={language === "ar" ? "ar" : "en"}
        className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[#1f2937] px-4 py-3 text-center text-[13px] text-white shadow-[0_-2px_8px_rgba(0,0,0,0.25)]"
      >
        <span className="font-bold">{t.label}</span>
        <span className="hidden text-white/75 sm:inline" title={expiresAtUtc ?? undefined}>
          {t.hint}
        </span>
        {/* A plain link, not next/link: the exit route is handled by middleware and must reload the page. */}
        <a href={PREVIEW_EXIT_PATH} className="rounded-full bg-white px-3 py-1 font-medium text-[#1f2937] hover:bg-white/90">
          {t.exit}
        </a>
      </div>
    </>
  );
}
