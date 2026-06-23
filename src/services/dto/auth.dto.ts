import type { UserDto } from './user.dto';

/** Відповідь ендпоінтів /api/me/auth та /api/me/dev-login. */
export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
  /** Час закінчення access-токена у UNIX-секундах. */
  accessTokenExpiresAt: number;
  /** Час закінчення refresh-токена у UNIX-секундах. */
  refreshTokenExpiresAt: number;
}

/** Відповідь ендпоінту /api/me/refresh. */
export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
  /** Час закінчення access-токена у UNIX-секундах. */
  accessTokenExpiresAt: number;
  /** Час закінчення refresh-токена у UNIX-секундах. */
  refreshTokenExpiresAt: number;
}
