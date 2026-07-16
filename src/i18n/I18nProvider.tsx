import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { retrieveLaunchParams } from '@telegram-apps/sdk';
import { useAuth } from '../hooks/useAuth';
import {
  getContent,
  getLanguages,
  getTranslations,
  setUserLanguage,
  type ContentResponse,
  type Language,
  type LanguagesResponse,
  type TranslationsResponse,
} from '../services/i18nApi';
import { setSuperProperty } from '../services/analytics';
import { I18nContext } from './context';

// ── Локальні типи кешу ────────────────────────────────────────────────────────

/** Кешований запис мов у localStorage. */
interface LanguagesCache {
  version: number;
  languages: Language[];
}

/** Кешований запис перекладів для конкретної мови у localStorage. */
interface ValuesCache {
  version: number;
  values: Record<string, string>;
}

/** Кешований запис контентних блоків для конкретної мови у localStorage. */
interface ContentCache {
  version: number;
  blocks: Record<string, string>;
}

// ── localStorage-хелпери ──────────────────────────────────────────────────────

const LS_LANG_KEY = 'i18n.lang';
const LS_LANGS_KEY = 'i18n.languages';

/** Ключ кешу перекладів для конкретної мови. */
function lsValKey(lang: string): string {
  return `i18n.values.${lang}`;
}

/** Ключ кешу контентних блоків для конкретної мови. */
function lsContentKey(lang: string): string {
  return `i18n.content.${lang}`;
}

/** Безпечне читання JSON із localStorage. Повертає null при будь-якій помилці. */
function lsRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Безпечний запис JSON у localStorage. Ігнорує помилку переповнення. */
function lsWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // сховище переповнене — ігноруємо
  }
}

// ── Telegram SDK helper ───────────────────────────────────────────────────────

/**
 * Розширений тип для захисного доступу до launch params Telegram.
 * SDK v3 не гарантує наявності tgWebAppData у всіх оточеннях.
 */
interface TgLaunchParamsLoose {
  tgWebAppData?: {
    user?: {
      language_code?: string;
    };
  };
}

/**
 * Отримати код мови з Telegram Mini App (ISO 639-1, перші 2 символи).
 * Повертає '' поза Telegram або при будь-якій помилці SDK.
 */
function getTelegramLangCode(): string {
  try {
    const lp = retrieveLaunchParams() as unknown as TgLaunchParamsLoose;
    const code = lp?.tgWebAppData?.user?.language_code;
    if (typeof code === 'string' && code.length >= 2) {
      return code.slice(0, 2).toLowerCase();
    }
    return '';
  } catch {
    return '';
  }
}

// ── Language resolution ───────────────────────────────────────────────────────

/**
 * Визначити активну мову за пріоритетом (вищий пріоритет — перший):
 *  1. Явний вибір користувача у localStorage (i18n.lang)
 *  2. Мова профілю авторизованого користувача (user.language)
 *  3. Мова Telegram Mini App (tgWebAppData.user.language_code)
 *  4. Мова браузера (navigator.language)
 *  5. Мова за замовчуванням (isDefault) або «en»
 *
 * Результат завжди обмежується списком підтримуваних кодів.
 * @param langs    — список підтримуваних мов
 * @param userLang — мова із профілю авторизованого користувача
 */
function computeLang(langs: Language[], userLang: string | undefined): string {
  const codes = langs.map((l) => l.code);
  const fallback = langs.find((l) => l.isDefault)?.code ?? 'en';

  const candidates: Array<string | undefined> = [
    localStorage.getItem(LS_LANG_KEY) ?? undefined,
    userLang,
    getTelegramLangCode() || undefined,
    navigator.language.slice(0, 2).toLowerCase() || undefined,
  ];

  for (const c of candidates) {
    if (c && codes.includes(c)) return c;
  }
  return fallback;
}

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Провайдер інтернаціоналізації.
 *
 * Стратегія завантаження (stale-while-revalidate + localStorage):
 *  - При наявності кешу → одразу встановлює ready=true,
 *    фоново перевіряє актуальність (порівнює version).
 *  - Без кешу → блокуюче завантаження, потім ready=true.
 *  - Мережеві помилки → fallback на кеш або порожній словник; не крашить застосунок.
 *
 * Повинен бути вкладений ВСЕРЕДИНУ AuthProvider (використовує useAuth).
 */
export const I18nProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [languages, setLanguages] = useState<Language[]>([]);
  const [lang, setLangRaw] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [contentBlocks, setContent] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  /** Захист від setState після розмонтування. */
  const mountedRef = useRef(true);
  /** Захист від повторного запуску ефекту ініціалізації (StrictMode). */
  const initStarted = useRef(false);

  // ── loadValues: cache-first завантаження перекладів ───────────────────────

  /**
   * Повернути переклади для вказаного коду мови.
   * Спочатку перевіряє localStorage-кеш; при відсутності — завантажує з API і кешує.
   */
  const loadValues = useCallback(
    async (code: string): Promise<Record<string, string>> => {
      const cached = lsRead<ValuesCache>(lsValKey(code));
      if (cached) return cached.values;
      try {
        const fresh: TranslationsResponse = await getTranslations(code);
        lsWrite(lsValKey(code), { version: fresh.version, values: fresh.values });
        return fresh.values;
      } catch {
        return {};
      }
    },
    [],
  );

  // ── loadContent: cache-first завантаження контентних блоків ───────────────

  /**
   * Повернути контентні блоки для вказаного коду мови.
   * Спочатку перевіряє localStorage-кеш; при відсутності — завантажує з API і кешує.
   */
  const loadContent = useCallback(
    async (code: string): Promise<Record<string, string>> => {
      const cached = lsRead<ContentCache>(lsContentKey(code));
      if (cached) return cached.blocks;
      try {
        const fresh: ContentResponse = await getContent(code);
        lsWrite(lsContentKey(code), { version: fresh.version, blocks: fresh.blocks });
        return fresh.blocks;
      } catch {
        return {};
      }
    },
    [],
  );

  // ── Ефект ініціалізації (один раз при монтуванні) ─────────────────────────

  useEffect(() => {
    // mountedRef відновлюємо на КОЖНОМУ (ре)монтуванні — інакше StrictMode-cleanup
    // першого монтування лишає false, і незавершений init() помилково виходить.
    mountedRef.current = true;

    /**
     * Фонова реvalidація: порівнює version і оновлює стан+кеш при розбіжності.
     * @param langsVer       — версія кешованих мов
     * @param currentLang    — поточний код мови
     * @param valsVer        — версія кешованих перекладів (undefined = кешу не було)
     * @param contentVer     — версія кешованих контентних блоків (undefined = кешу не було)
     */
    const revalidate = async (
      langsVer: number,
      currentLang: string,
      valsVer: number | undefined,
      contentVer: number | undefined,
    ): Promise<void> => {
      try {
        const freshLangs: LanguagesResponse = await getLanguages();
        if (mountedRef.current && freshLangs.version !== langsVer) {
          lsWrite(LS_LANGS_KEY, {
            version: freshLangs.version,
            languages: freshLangs.languages,
          });
          setLanguages(freshLangs.languages);
        }
      } catch {
        // мережева помилка — залишаємо кеш
      }

      try {
        const freshVals: TranslationsResponse = await getTranslations(currentLang);
        if (mountedRef.current && freshVals.version !== valsVer) {
          lsWrite(lsValKey(currentLang), {
            version: freshVals.version,
            values: freshVals.values,
          });
          setValues(freshVals.values);
        }
      } catch {
        // мережева помилка — залишаємо кеш
      }

      try {
        const freshContent: ContentResponse = await getContent(currentLang);
        if (mountedRef.current && freshContent.version !== contentVer) {
          lsWrite(lsContentKey(currentLang), {
            version: freshContent.version,
            blocks: freshContent.blocks,
          });
          setContent(freshContent.blocks);
        }
      } catch {
        // мережева помилка — залишаємо кеш
      }
    };

    const init = async (): Promise<void> => {
      // 1. Читаємо кешовані мови
      const cachedLangs = lsRead<LanguagesCache>(LS_LANGS_KEY);
      let langs: Language[] = cachedLangs?.languages ?? [];

      // 2. Якщо немає кешу мов — завантажуємо (блокуюче)
      if (!cachedLangs) {
        try {
          const fresh: LanguagesResponse = await getLanguages();
          langs = fresh.languages;
          lsWrite(LS_LANGS_KEY, { version: fresh.version, languages: langs });
        } catch {
          // мережева помилка — продовжуємо з порожнім списком
        }
      }

      if (!mountedRef.current) return;

      // 3. Визначаємо мову за пріоритетами (user може бути null на цьому етапі)
      const resolved = computeLang(langs, user?.language);

      // 4. Читаємо кешовані переклади та контентні блоки
      const cachedVals = lsRead<ValuesCache>(lsValKey(resolved));
      const cachedContent = lsRead<ContentCache>(lsContentKey(resolved));

      if (cachedLangs && cachedVals && cachedContent) {
        // Всі три кеші є → ready одразу, реvalidація у фоні
        setLanguages(langs);
        setLangRaw(resolved);
        setValues(cachedVals.values);
        setContent(cachedContent.blocks);
        setReady(true);
        void revalidate(
          cachedLangs.version,
          resolved,
          cachedVals.version,
          cachedContent.version,
        );
      } else {
        // Відсутній хоча б один кеш → завантажуємо паралельно (блокуюче)
        const [vals, blocks] = await Promise.all([
          cachedVals
            ? Promise.resolve(cachedVals.values)
            : getTranslations(resolved)
                .then((fresh) => {
                  lsWrite(lsValKey(resolved), {
                    version: fresh.version,
                    values: fresh.values,
                  });
                  return fresh.values;
                })
                .catch(() => ({} as Record<string, string>)),
          cachedContent
            ? Promise.resolve(cachedContent.blocks)
            : getContent(resolved)
                .then((fresh) => {
                  lsWrite(lsContentKey(resolved), {
                    version: fresh.version,
                    blocks: fresh.blocks,
                  });
                  return fresh.blocks;
                })
                .catch(() => ({} as Record<string, string>)),
        ]);
        if (!mountedRef.current) return;
        setLanguages(langs);
        setLangRaw(resolved);
        setValues(vals);
        setContent(blocks);
        setReady(true);
      }
    };

    // init() лише раз за життя застосунку (guard від StrictMode double-invoke)
    if (!initStarted.current) {
      initStarted.current = true;
      void init();
    }

    return () => {
      mountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Аналітична super property app_language — синхронізуємо з активною мовою
  // (початкове визначення + кожне подальше перемикання через setLang).
  useEffect(() => {
    if (lang) setSuperProperty('app_language', lang);
  }, [lang]);

  // ── setLang: переключення мови ────────────────────────────────────────────

  /**
   * Переключити активну мову.
   * Персистує явний вибір, завантажує переклади (з кешу або мережі),
   * та — якщо користувач авторизований — асинхронно оновлює мову на бекенді.
   */
  const setLang = useCallback(
    (code: string): void => {
      localStorage.setItem(LS_LANG_KEY, code);
      setLangRaw(code);

      // loadValues та loadContent перевіряють кеш; при промаху завантажують і кешують
      void loadValues(code).then((vals) => {
        if (mountedRef.current) setValues(vals);
      });
      void loadContent(code).then((blocks) => {
        if (mountedRef.current) setContent(blocks);
      });

      if (user) {
        void setUserLanguage(code).catch(() => {
          // fire-and-forget — помилка не критична
        });
      }
    },
    [user, loadValues, loadContent],
  );

  // ── t(): переклад із інтерполяцією ────────────────────────────────────────

  /**
   * Повернути переклад за ключем.
   * Якщо ключ відсутній — повертає сам ключ (видимий fallback).
   * Замінює всі `{{name}}` на значення з `vars`; невідомі змінні залишаються як `{{name}}`.
   */
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const raw = values[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
        const val = vars[name];
        return val !== undefined ? String(val) : match;
      });
    },
    [values],
  );

  // ── content(): контентний блок за ключем ─────────────────────────────────

  /**
   * Повернути контентний блок за ключем (напр. «terms», «auth_unavailable»).
   * Якщо блок ще не завантажений або ключ відсутній — повертає порожній рядок.
   * Порожній рядок є навмисним fallback: довгі тексти не повинні показувати ключ.
   */
  const content = useCallback(
    (key: string): string => contentBlocks[key] ?? '',
    [contentBlocks],
  );

  return (
    <I18nContext.Provider value={{ t, content, lang, setLang, languages, ready }}>
      {children}
    </I18nContext.Provider>
  );
};
