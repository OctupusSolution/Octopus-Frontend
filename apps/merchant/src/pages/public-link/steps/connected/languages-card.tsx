// Site languages (PUT /draft/settings): the default language and which of the
// catalogue's languages are enabled. The default is always enabled.
import { useI18n } from "@/app/providers/i18n-provider";
import type { PublicLinkSync } from "@/entities/site-draft";
import { usePlText } from "../../_shared/texts";
import { Switch } from "../../ui/switch";
import { CARD_NOTE, useBusy } from "./common";

const LANGUAGE_NAMES: Record<string, { en: string; ar: string }> = {
  ar: { en: "Arabic", ar: "العربية" },
  en: { en: "English", ar: "الإنجليزية" },
};

export function LanguagesCard({ sync }: { sync: PublicLinkSync }) {
  const { locale } = useI18n();
  const tx = usePlText();
  const { act, busy } = useBusy();
  const server = sync.server;
  const languages = server?.catalogues?.languages ?? [];
  if (!server || languages.length < 2) return null;
  const { defaultLanguage, enabledLanguages } = server.overview.settings;
  const name = (code: string) => LANGUAGE_NAMES[code]?.[locale === "ar" ? "ar" : "en"] ?? code.toUpperCase();

  function save(nextDefault: string, nextEnabled: string[]) {
    const enabled = Array.from(new Set([nextDefault, ...nextEnabled]));
    void act("languages", () => sync.updateLanguages(nextDefault, enabled));
  }

  return (
    <section className="flex flex-col gap-3 border-t border-[var(--octo-divider)] pt-4">
      <p className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{tx("pl.languages.title")}</p>
      <p className={CARD_NOTE + " mt-0"}>{tx("pl.languages.note")}</p>
      <div className="flex flex-col gap-2">
        {languages.map((language) => {
          const isDefault = language.code === defaultLanguage;
          const enabled = enabledLanguages.includes(language.code);
          return (
            <div
              key={language.code}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2"
            >
              <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
                {name(language.code)} <span className="text-[11px] text-[var(--octo-text-faint)]">({language.direction})</span>
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[12px] text-[var(--octo-text-secondary)]">
                  <input
                    type="radio"
                    name="pl-default-language"
                    checked={isDefault}
                    disabled={busy !== null}
                    onChange={() => save(language.code, enabledLanguages)}
                    className="accent-[#0D6EFD]"
                  />
                  {tx("pl.languages.default")}
                </label>
                <span className="flex items-center gap-1.5 text-[12px] text-[var(--octo-text-secondary)]">
                  {tx("pl.languages.enabled")}
                  <Switch
                    checked={enabled}
                    label={`${name(language.code)} — ${tx("pl.languages.enabled")}`}
                    onChange={() => {
                      if (isDefault || busy !== null) return;
                      save(defaultLanguage, enabled ? enabledLanguages.filter((c) => c !== language.code) : [...enabledLanguages, language.code]);
                    }}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
