/**
 * HTTP-клієнт для ресурсу /api/leaderboard.
 *
 * Функції:
 *   getLeaderboard — завантажує топ гравців за кількістю перемог
 */

import { get } from './http';
import type { LeaderboardDto } from './dto/leaderboard.dto';
import type { Leader } from '../types/leaderboard';

/**
 * Завантажує лідерборд (топ переможців). Бекенд уже фільтрує гравців без перемог
 * і повертає їх у правильному порядку (wins DESC, тай-брейк за часом перемоги),
 * тож rank призначаємо послідовно за позицією у відповіді.
 */
export async function getLeaderboard(): Promise<Leader[]> {
  const dto = await get<LeaderboardDto>('/api/leaderboard');
  return dto.leaders.map((e, i) => ({
    id: e.id,
    rank: i + 1,
    nickname: `@${e.nickname}`,
    wins: e.wins,
  }));
}
