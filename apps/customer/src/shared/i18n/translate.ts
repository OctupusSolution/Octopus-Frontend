import { ar, en, type Locale } from "@i18n/index";

const dictionaries: Record<Locale, Record<string, string>> = { en, ar };

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** One translator, used by both the client provider and by server components.
 *  Pages are server components and cannot call the useI18n hook, but their
 *  breadcrumbs and titles still need translating — so the lookup and the
 *  `{name}` interpolation live here rather than being written twice. */
export function createTranslator(locale: Locale): Translate {
  const dict = dictionaries[locale];
  return (key, vars) => {
    const template = dict[key] ?? key;
    if (!vars) return template;
    return Object.entries(vars).reduce(
      (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
      template,
    );
  };
}
