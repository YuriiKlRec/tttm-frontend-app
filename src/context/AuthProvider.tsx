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
import { retrieveRawInitData } from '@telegram-apps/sdk';
import { env } from '../config/env';
import { setToken } from '../services/http';
import {
  authWithTelegram,
  authDevLogin,
  fetchCurrentUser,
  storeTokens,
  clearTokens,
  type AuthResponseDto,
} from '../services/auth.service';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  isAccessTokenValid,
  isRefreshTokenValid,
} from '../services/token-storage';
import type { UserDto } from '../services/dto/user.dto';
import { useLiveStore } from '../store/liveStore';

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
 * Провайдер автентифікації.
 * Порядок спроб при mount:
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

  /** Зберегти токени, встановити in-memory токен і оновити стан користувача. */
  const applyAuthResponse = useCallback(
    (dto: AuthResponseDto): void => {
      storeTokens(dto);
      setToken(dto.accessToken);
      setUser(dto.user);
      // Синхронізуємо myUserId у liveStore для mine/win-логіки real-time подій
      useLiveStore.getState().setMyUserId(dto.user.id);
    },
    [],
  );

  const login = useCallback(async (): Promise<void> => {
    const initData = readTelegramInitData();

    if (initData) {
      const dto = await authWithTelegram(initData, tz);
      applyAuthResponse(dto);
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

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const initializeAuth = async (): Promise<void> => {
      try {
        // Спроба 1: є валідний збережений access-токен
        const storedAccess = getStoredAccessToken();
        if (storedAccess && isAccessTokenValid()) {
          setToken(storedAccess);
          try {
            const currentUser = await fetchCurrentUser();
            setUser(currentUser);
            // Синхронізуємо myUserId після відновлення сесії за access-токеном
            useLiveStore.getState().setMyUserId(currentUser.id);
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
            useLiveStore.getState().setMyUserId(currentUser.id);
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
      } finally {
        setReady(true);
      }
    };

    void initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, tz, ready, login, refreshUser }}>
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
