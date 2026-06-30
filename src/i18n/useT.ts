import { useContext } from 'react';
import { I18nContext, type I18nContextValue } from './context';

/**
 * Хук для доступу до контексту інтернаціоналізації.
 * Повертає `{ t, lang, setLang, languages, ready }`.
 * @returns {I18nContextValue}
 * @throws якщо використовується поза I18nProvider
 */
export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useT має використовуватись усередині I18nProvider');
  }
  return ctx;
}
