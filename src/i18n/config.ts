export const locales = ['he', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'he';

export const rtlLocales: ReadonlySet<Locale> = new Set(['he']);

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return rtlLocales.has(locale) ? 'rtl' : 'ltr';
}
