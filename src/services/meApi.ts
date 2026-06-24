import { post, put } from './http';
import type { UserDto } from './dto/user.dto';

/** Відповідь бекенду на POST /api/me/accept-terms. */
interface AcceptTermsResponse {
  message: string;
  user: Pick<UserDto, 'id' | 'nickname' | 'termsAccepted'>;
}

/**
 * Прийняти угоду користувача — POST /api/me/accept-terms.
 * ValidationError не очікується, але propagate-уємо будь-яку ApiError нагору.
 */
export async function acceptTerms(): Promise<void> {
  await post<AcceptTermsResponse>('/api/me/accept-terms');
}

/**
 * Оновити нікнейм поточного користувача — PUT /api/me.
 * Якщо нік не проходить бекенд-валідацію, бекенд повертає 400/422
 * → http.ts перетворює у ValidationError (має поле errors: string[]).
 * ValidationError propagate-ується далі — обробляти на рівні UI.
 */
export async function updateNickname(nickname: string): Promise<UserDto> {
  return put<UserDto>('/api/me', { nickname });
}
