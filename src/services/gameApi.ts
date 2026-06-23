/**
 * HTTP-клієнт для ресурсу /api/games.
 *
 * Мінімальна реалізація — тільки getGame.
 * Task F2 розширить цей модуль функцією listGames та іншими ендпоінтами.
 */

import { get } from './http';
import { toGameDetail } from './mappers';
import type { GameDto } from './dto/game.dto';
import type { GameDetail } from '../types/game';

/**
 * Завантажує деталі однієї гри з бекенду.
 *
 * @param id - унікальний ідентифікатор гри
 * @returns GameDetail (view-модель)
 */
export async function getGame(id: string): Promise<GameDetail> {
  const dto = await get<GameDto>(`/api/games/${id}`);
  return toGameDetail(dto);
}

// F2 розширить цей файл функцією listGames (Paginated<Game>)
