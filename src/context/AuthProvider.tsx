import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { retrieveRawInitData, retrieveLaunchParams, requestWriteAccess } from '@telegram-apps/sdk';
import { env } from '../config/env';
import { setToken } from '../services/http';
import {
  authWithTelegram,
  authDevLogin,
  fetchCurrentUser,
  grantWriteAccess,
  storeTokens,
  clearTokens,
  type AuthResponseDto,
} from '../services/auth.service';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  isAccessTokenValid,
  isRefreshTokenValid,
  getStoredTgUserId,
  storeTgUserId,
  clearTgUserId,
} from '../services/token-storage';
import type { UserDto } from '../services/dto/user.dto';
import { useLiveStore } from '../store/liveStore';
import { connectRealtime, disconnectRealtime } from '../services/realtime';

/** Контракт контексту автентифікації. */
export interface AuthContextValue {
  user: UserDto | null;
  /** Поточна таймзона браузера. */
  tz: string;
  /** true після завершення ініціалізації (незалежно від результату). */
  ready: boolean;
  /** Виконати логін (Telegram / dev-bypass). */
  login: () => Promise<void>;
  /** Перезавантажити дані поточного користувача з бекенду. */
  refreshUser: () => Promise<void>;
  /** Оновити user у контексті без звернення до бекенду (напр. після acceptTerms). */
  updateUser: (u: UserDto) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Спробувати отримати raw Telegram initData.
 * Повертає рядок або undefined — ніколи не кидає.
 */
function readTelegramInitData(): string | undefined {
  try {
    // TODO: retrieveRawInitData() кидає LaunchParamsRetrieveError поза Telegram-оточенням.
    // Перехоплюємо помилку і повертаємо undefined — dev-bypass path спрацює натомість.
    return retrieveRawInitData();
  } catch {
    return undefined;
  }
}

/**
 * Розширений тип для захисного доступу до launch params Telegram.
 * SDK v3 не гарантує наявності tgWebAppData у всіх оточеннях (той самий патерн,
 * що й у I18nProvider.getTelegramLangCode).
 */
interface TgLaunchParamsLoose {
  tgWebAppData?: {
    user?: {
      id?: number | string;
    };
  };
}

/**
 * Спробувати отримати Telegram user.id з поточних launch params (СВІЖИЙ initData,
 * а не збережений у localStorage — саме те, з чим прийшов юзер ЗАРАЗ).
 * Повертає рядок або undefined поза Telegram-оточенням чи при будь-якій помилці SDK.
 */
function readTelegramUserId(): string | undefined {
  try {
    const lp = retrieveLaunchParams() as unknown as TgLaunchParamsLoose;
    const id = lp?.tgWebAppData?.user?.id;
    return id === undefined || id === null ? undefined : String(id);
  } catch {
    return undefined;
  }
}

/**
 * Провайдер автентифікації.
 * Порядок спроб при mount:
 *   0. Інваріант: якщо є Telegram initData І збережена сесія (токени) — звірити
 *      tg user.id з initData зі збереженим tg_user_id. Розбіжність (у т.ч.
 *      відсутність маркера — legacy-сесія без нього) → повне очищення сесії
 *      (токени + tg_user_id + liveStore) і одразу крок 3 (без спроб 1/2).
 *      Захищає від витоку сесії між Telegram-акаунтами на одному пристрої —
 *      localStorage WebView спільний для всіх акаунтів.
 *   1. Якщо є валідний access-токен у localStorage → setToken + GET /api/me.
 *   2. Якщо є валідний refresh-токен → refresh-on-401 у http.ts впорається автоматично.
 *   3. Якщо є Telegram initData → POST /api/me/auth.
 *   4. Якщо env.devBypassAuth → POST /api/me/dev-login.
 *   5. Інакше — user=null, ready=true (гість).
 */
export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [ready, setReady] = useState(false);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Захист від повторного запуску (StrictMode подвійний mount)
  const initStartedRef = useRef(false);
  // Захист: запитуємо write-access лише один раз за монтування
  const writeAccessAskedRef = useRef(false);

  /** Зберегти токени, встановити in-memory токен і оновити стан користувача. */
  const applyAuthResponse = useCallback(
    (dto: AuthResponseDto): void => {
      storeTokens(dto);
      setToken(dto.accessToken);
      setUser(dto.user);
      // Синхронізуємо myUserId + нік у liveStore (mine/win + підпис своїх live-ставок)
      useLiveStore.getState().setMyUserId(dto.user.id, dto.user.nickname);
      // Підключаємо WebSocket app-wide після успішної автентифікації
      connectRealtime(dto.accessToken);
    },
    [],
  );

  const login = useCallback(async (): Promise<void> => {
    const initData = readTelegramInitData();

    if (initData) {
      const dto = await authWithTelegram(initData, tz);
      applyAuthResponse(dto);
      // Фіксуємо, ЯКОМУ tg-акаунту належить щойно збережена сесія — окремо від
      // токенів (JWT містить БД-id, не tg id). Це єдине джерело правди для
      // виявлення зміни акаунта на наступному старті (localStorage спільний
      // для всіх акаунтів у Telegram WebView одного пристрою).
      const tgUserId = readTelegramUserId();
      if (tgUserId) storeTgUserId(tgUserId);
      return;
    }

    if (env.devBypassAuth) {
      const dto = await authDevLogin(tz);
      applyAuthResponse(dto);
      return;
    }

    throw new Error('Автентифікація недоступна: Telegram initData відсутні і devBypassAuth вимкнено');
  }, [tz, applyAuthResponse]);

  const refreshUser = useCallback(async (): Promise<void> => {
    const freshUser = await fetchCurrentUser();
    setUser(freshUser);
  }, []);

  /** Синхронно замінює user у контексті (без запиту до бекенду). */
  const updateUser = useCallback((u: UserDto): void => {
    setUser(u);
  }, []);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const initializeAuth = async (): Promise<void> => {
      try {
        // Інваріант безпеки: сесія завжди належить АКТУАЛЬНОМУ tg-користувачу.
        // localStorage у Telegram WebView спільний для всіх акаунтів на пристрої —
        // якщо юзер перемкнув акаунт у Telegram, збережені токени належать
        // ПОПЕРЕДНЬОМУ акаунту. Порівнюємо tg user.id зі СВІЖОГО initData з
        // tg user.id, збереженим під час логіну, що видав поточні токени.
        // Якщо збереженої сесії взагалі немає — порівнювати нема з чим, пропускаємо
        // (звичайний перший запуск піде звичним шляхом нижче).
        const currentTgUserId = readTelegramUserId();
        const hasStoredSession = Boolean(getStoredAccessToken() || getStoredRefreshToken());
        if (currentTgUserId && hasStoredSession) {
          const storedTgUserId = getStoredTgUserId();
          // Розбіжність АБО відсутність маркера (сесія збережена до цього фікса,
          // коли tg_user_id ще не писався) — довіряти токену не можна.
          if (storedTgUserId !== currentTgUserId) {
            clearTokens();
            clearTgUserId();
            setToken(null);
            disconnectRealtime();
            useLiveStore.getState().resetSession();
            // Повна реавторизація по СВІЖОМУ initData поточного акаунта.
            // Бекенд поверне termsAccepted=false для нового користувача —
            // OnboardingGate сам поведе на /welcome.
            await login();
            return;
          }
        }

        // У Telegram-контексті ЗАВЖДИ реавторизуємось по свіжому initData
        // (як старий frontend): бекенд щоразу верифікує підпис Telegram
        // (verifyTelegramAuth) і видає токени саме поточному акаунту —
        // збережені токени використовуються лише всередині сесії.
        if (currentTgUserId) {
          await login()
          return
        }

        // Спроба 1: є валідний збережений access-токен
        const storedAccess = getStoredAccessToken();
        if (storedAccess && isAccessTokenValid()) {
          setToken(storedAccess);
          try {
            const currentUser = await fetchCurrentUser();
            setUser(currentUser);
            // Синхронізуємо myUserId після відновлення сесії за access-токеном
            useLiveStore.getState().setMyUserId(currentUser.id, currentUser.nickname);
            // Підключаємо WebSocket з відновленим access-токеном
            connectRealtime(storedAccess);
            return;
          } catch {
            // Токен протух або відкликаний — продовжуємо нижче
            clearTokens();
            setToken(null);
            useLiveStore.getState().setMyUserId(null);
          }
        }

        // Спроба 2: є збережений refresh-токен.
        // Надсилаємо GET /api/me без access-токена → отримуємо 401 →
        // http.ts підхоплює, викликає /api/me/refresh, оновлює токен і повторює запит.
        const storedRefresh = getStoredRefreshToken();
        if (storedRefresh && isRefreshTokenValid()) {
          setToken(null);
          try {
            const currentUser = await fetchCurrentUser();
            setUser(currentUser);
            // Синхронізуємо myUserId після відновлення сесії за refresh-токеном
            useLiveStore.getState().setMyUserId(currentUser.id, currentUser.nickname);
            // Токен міг оновитись у http.ts; читаємо актуальний зі сховища
            const refreshedAccess = getStoredAccessToken();
            connectRealtime(refreshedAccess);
            return;
          } catch {
            // refresh також не вдався — повна реавторизація
            clearTokens();
            useLiveStore.getState().setMyUserId(null);
          }
        }

        // Спроба 3 / 4: Telegram або dev-bypass
        await login();
      } catch {
        // Автентифікація не вдалась — гостьовий режим
        setUser(null);
        useLiveStore.getState().setMyUserId(null);
        disconnectRealtime();
      } finally {
        setReady(true);
      }
    };

    void initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Після авторизації: якщо Telegram ще не надав дозвіл на ЛС — запитуємо
  // його один раз і повідомляємо бекенд через grant-write-access.
  useEffect(() => {
    if (!user || user.canNotify) return;
    if (writeAccessAskedRef.current) return;
    if (!requestWriteAccess.isAvailable()) return;

    writeAccessAskedRef.current = true;

    const ensureWriteAccess = async (): Promise<void> => {
      try {
        const status = await requestWriteAccess();
        if (status === 'allowed') {
          const updated = await grantWriteAccess();
          setUser(updated);
        }
      } catch (err: unknown) {
        console.warn('[AuthProvider] requestWriteAccess failed:', err);
      }
    };

    void ensureWriteAccess();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, tz, ready, login, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/** Доступ до контексту автентифікації. Кидає помилку поза AuthProvider. */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext має використовуватись усередині AuthProvider');
  }
  return ctx;
}
