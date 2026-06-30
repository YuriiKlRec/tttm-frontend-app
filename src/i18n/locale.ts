/** Зіставлення ISO 639-1 коду мови з BCP-47 локаллю для Intl-форматування. */

import { useT } from './useT';

/** Явні відповідності мова → BCP-47 локаль (для коректних місяців/дат). */
const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  uk: 'uk-UA',
  ru: 'ru-RU',
};

/**
 * Повертає BCP-47 локаль для ISO 639-1 коду мови.
 * Для невідомих кодів пробує сам код (Intl його зрозуміє), інакше — 'en-US'.
 */
export const langToLocale = (lang: string): string =>
  LOCALE_MAP[lang] ?? (lang || 'en-US');

/**
 * Хук: повертає активну BCP-47 локаль на основі поточної мови з i18n-контексту.
 * Використовується в компонентах для передачі локалі в date-утиліти.
 */
export const useLocale = (): string => {
  const { lang } = useT();
  return langToLocale(lang);
};
