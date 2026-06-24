import { get, post } from './http';
import type { AuthResponseDto, RefreshResponseDto } from './dto/auth.dto';
import type { UserDto } from './dto/user.dto';
import { storeTokens, clearTokens } from './token-storage';

export { storeTokens, clearTokens };
export type { AuthResponseDto, RefreshResponseDto };

/** Авторизація через Telegram initData. */
export function authWithTelegram(initData: string, timezone: string): Promise<AuthResponseDto> {
  return post<AuthResponseDto>('/api/me/auth', { initData, timezone });
}

/** Авторизація через dev-bypass (тільки при VITE_DEV_BYPASS_AUTH=true). */
export function authDevLogin(timezone: string): Promise<AuthResponseDto> {
  return post<AuthResponseDto>('/api/me/dev-login', { timezone });
}

/** Оновлення access-токена. Зберігає нові токени у localStorage. */
export async function doRefreshToken(refreshToken: string): Promise<RefreshResponseDto> {
  const dto = await post<RefreshResponseDto>('/api/me/refresh', { refreshToken });
  storeTokens(dto);
  return dto;
}

/** Отримання поточного користувача (GET /api/me, потребує Bearer-токена). */
export function fetchCurrentUser(): Promise<UserDto> {
  return get<UserDto>('/api/me');
}

/**
 * Підтвердити дозвіл на надсилання повідомлень — POST /api/me/grant-write-access.
 * Викликається після того як requestWriteAccess() від Telegram повернув 'allowed'.
 * Повертає оновлений UserDto з canNotify=true.
 */
export function grantWriteAccess(): Promise<UserDto> {
  return post<UserDto>('/api/me/grant-write-access');
}
