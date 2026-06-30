import { get, patch } from './http';

/** Опис мови з бекенду. */
export interface Language {
  code: string;
  name: string;
  isDefault: boolean;
}

/** Відповідь GET /api/i18n/languages. */
export interface LanguagesResponse {
  version: number;
  languages: Language[];
}

/** Відповідь GET /api/i18n/translations/:lang. */
export interface TranslationsResponse {
  lang: string;
  version: number;
  values: Record<string, string>;
}

/**
 * Отримати список підтримуваних мов із бекенду.
 * Відповідь кешується на рівні HTTP (ETag + must-revalidate).
 */
export async function getLanguages(): Promise<LanguagesResponse> {
  return get<LanguagesResponse>('/api/i18n/languages');
}

/**
 * Отримати переклади для конкретної мови.
 * @param lang — ISO 639-1 код мови (напр. «uk», «en»)
 */
export async function getTranslations(lang: string): Promise<TranslationsResponse> {
  return get<TranslationsResponse>(`/api/i18n/translations/${lang}`);
}

/**
 * Встановити мову інтерфейсу для авторизованого користувача.
 * Виклик «fire-and-forget» — помилки не обробляються на рівні сервісного шару.
 * @param lang — ISO 639-1 код мови
 */
export async function setUserLanguage(lang: string): Promise<void> {
  await patch<unknown>('/api/me/language', { language: lang });
}

/** Відповідь GET /api/i18n/content/:lang. */
export interface ContentResponse {
  lang: string;
  version: number;
  blocks: Record<string, string>;
}

/**
 * Отримати контентні блоки для конкретної мови.
 * Відповідь кешується на рівні HTTP (ETag + must-revalidate).
 * @param lang — ISO 639-1 код мови (напр. «uk», «en»)
 */
export async function getContent(lang: string): Promise<ContentResponse> {
  return get<ContentResponse>(`/api/i18n/content/${lang}`);
}
