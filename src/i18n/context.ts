import { createContext } from 'react';
import type { Language } from '../services/i18nApi';

/** Контракт контексту інтернаціоналізації. */
export interface I18nContextValue {
  /**
   * Отримати переклад за ключем із підтримкою інтерполяції `{{var}}`.
   * Якщо ключ відсутній у словнику — повертає сам ключ.
   */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /**
   * Отримати контентний блок за ключем (напр. «terms», «auth_unavailable»).
   * Якщо блок ще не завантажений або ключ відсутній — повертає порожній рядок.
   */
  content: (key: string) => string;
  /** Активний ISO 639-1 код мови (напр. «uk», «en»). */
  lang: string;
  /** Перемкнути мову; персистує вибір і завантажує переклади. */
  setLang: (code: string) => void;
  /** Список підтримуваних мов. */
  languages: Language[];
  /** true — переклади завантажені та готові до відображення. */
  ready: boolean;
}

/** React-контекст i18n. Значення встановлюється I18nProvider. */
export const I18nContext = createContext<I18nContextValue | null>(null);
