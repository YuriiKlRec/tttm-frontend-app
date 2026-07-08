/** Ключі localStorage для зберігання JWT-токенів. */
const KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  accessTokenExpiresAt: 'accessTokenExpiresAt',
  refreshTokenExpiresAt: 'refreshTokenExpiresAt',
  /**
   * Telegram user.id, ЗБЕРЕЖЕНИЙ ОКРЕМО від токенів у момент логіну через initData.
   * JWT-токени містять БД-id користувача (не tg id), тому саме цей ключ —
   * єдине джерело правди про те, ЯКОМУ tg-акаунту належить збережена сесія.
   * localStorage у Telegram WebView СПІЛЬНИЙ для всіх акаунтів на пристрої —
   * без цього ключа неможливо виявити перемикання акаунта (див. AuthProvider).
   */
  tgUserId: 'tgUserId',
} as const;

/** Тип, який містить обидва токени та їх часи закінчення (у UNIX-секундах). */
export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** UNIX-секунди. */
  accessTokenExpiresAt: number;
  /** UNIX-секунди. */
  refreshTokenExpiresAt: number;
}

/** Зберігає токени, конвертуючи expiresAt з UNIX-секунд у мілісекунди. */
export function storeTokens(tokens: TokenSet): void {
  localStorage.setItem(KEYS.accessToken, tokens.accessToken);
  localStorage.setItem(KEYS.refreshToken, tokens.refreshToken);
  localStorage.setItem(
    KEYS.accessTokenExpiresAt,
    (tokens.accessTokenExpiresAt * 1000).toString(),
  );
  localStorage.setItem(
    KEYS.refreshTokenExpiresAt,
    (tokens.refreshTokenExpiresAt * 1000).toString(),
  );
}

/** Видаляє всі токени з localStorage. */
export function clearTokens(): void {
  localStorage.removeItem(KEYS.accessToken);
  localStorage.removeItem(KEYS.refreshToken);
  localStorage.removeItem(KEYS.accessTokenExpiresAt);
  localStorage.removeItem(KEYS.refreshTokenExpiresAt);
}

/** Повертає збережений access-токен або null. */
export function getStoredAccessToken(): string | null {
  return localStorage.getItem(KEYS.accessToken);
}

/** Повертає збережений refresh-токен або null. */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(KEYS.refreshToken);
}

/** Перевіряє, чи access-токен ще дійсний (з буфером 30 секунд). */
export function isAccessTokenValid(): boolean {
  const token = localStorage.getItem(KEYS.accessToken);
  const expiresAt = localStorage.getItem(KEYS.accessTokenExpiresAt);
  if (!token || !expiresAt) return false;
  return Date.now() + 30_000 < parseInt(expiresAt, 10);
}

/** Перевіряє, чи refresh-токен ще дійсний. */
export function isRefreshTokenValid(): boolean {
  const token = localStorage.getItem(KEYS.refreshToken);
  const expiresAt = localStorage.getItem(KEYS.refreshTokenExpiresAt);
  if (!token || !expiresAt) return false;
  return Date.now() < parseInt(expiresAt, 10);
}

/** Зберігає tg user.id, з яким виконано логін через Telegram initData. */
export function storeTgUserId(id: string): void {
  localStorage.setItem(KEYS.tgUserId, id);
}

/** Повертає tg user.id, збережений під час останнього логіну через initData, або null. */
export function getStoredTgUserId(): string | null {
  return localStorage.getItem(KEYS.tgUserId);
}

/** Видаляє збережений tg user.id (частина повного очищення сесії при зміні акаунта). */
export function clearTgUserId(): void {
  localStorage.removeItem(KEYS.tgUserId);
}
