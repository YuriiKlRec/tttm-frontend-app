/**
 * HTTP-клієнт для ресурсу /api/me/profile.
 *
 * Функції:
 *   getProfile — завантажує профіль поточного користувача
 */

import { get } from './http';
import { toProfile } from './mappers';
import type { ProfileDto } from './dto/profile.dto';
import type { Profile } from '../types/profile';

/**
 * Завантажує профіль поточного авторизованого користувача.
 *
 * @param nickname — нік користувача з useAuth (додається префікс '@' у view-моделі)
 * @returns Profile (view-модель сторінки профілю)
 */
export async function getProfile(nickname: string): Promise<Profile> {
  const dto = await get<ProfileDto>('/api/me/profile');
  return toProfile(dto, nickname);
}
