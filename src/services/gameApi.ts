/**
 * HTTP-клієнт для ресурсу /api/games.
 *
 * Функції:
 *   getGame       — деталі однієї гри
 *   listPredictions — список активних ігор (вкладка Predictions)
 *   listWaiting   — список ігор у фазі очікування (вкладка Waiting)
 *   listResults   — список завершених ігор (вкладка Results)
 */

import { get } from './http';
import { toGameDetail, toGameCard, toResultCard, toWaitCard } from './mappers';
import type { GameDto, Paginated } from './dto/game.dto';
import type { GameDetail, Game } from '../types/game';
import type { ResultGame } from '../mocks/results';
import type { WaitGame } from '../mocks/waitGames';

/** Результат сторінки для useInfiniteGames. */
export interface PageResult<T> {
  items: T[];
  total: number;
}

/**
 * Завантажує деталі однієї гри з бекенду.
 *
 * @param id       — унікальний ідентифікатор гри
 * @param myUserId — ID поточного користувача; потрібен для yourTickets/takenByOthers
 * @returns GameDetail (view-модель)
 */
export async function getGame(id: string, myUserId?: string | null): Promise<GameDetail> {
  const dto = await get<GameDto>(`/api/games/${id}`);
  return toGameDetail(dto, myUserId);
}

/**
 * Завантажує сторінку активних ігор (вкладка Predictions).
 *
 * @param page - номер сторінки (1-based)
 * @param perPage - кількість елементів на сторінку
 * @param myUserId - ID поточного користувача або null
 */
export async function listPredictions(
  page: number,
  perPage: number,
  myUserId: string | null,
): Promise<PageResult<Game>> {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    isPredictions: 'true',
  });
  const response = await get<Paginated<GameDto>>(`/api/games?${params.toString()}`);
  return {
    items: response.data.map((dto) => toGameCard(dto, myUserId)),
    total: response.meta.total,
  };
}

/**
 * Завантажує сторінку ігор у фазі очікування (вкладка Waiting).
 *
 * @param page - номер сторінки (1-based)
 * @param perPage - кількість елементів на сторінку
 * @param myUserId - ID поточного користувача або null
 */
export async function listWaiting(
  page: number,
  perPage: number,
  myUserId: string | null,
): Promise<PageResult<WaitGame>> {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    isWaiting: 'true',
  });
  const response = await get<Paginated<GameDto>>(`/api/games?${params.toString()}`);
  return {
    items: response.data.map((dto) => toWaitCard(dto, myUserId)),
    total: response.meta.total,
  };
}

/**
 * Завантажує сторінку завершених ігор (вкладка Results).
 *
 * @param page - номер сторінки (1-based)
 * @param perPage - кількість елементів на сторінку
 * @param myUserId - ID поточного користувача або null
 */
export async function listResults(
  page: number,
  perPage: number,
  myUserId: string | null,
): Promise<PageResult<ResultGame>> {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    isResults: 'true',
  });
  const response = await get<Paginated<GameDto>>(`/api/games?${params.toString()}`);
  return {
    items: response.data.map((dto) => toResultCard(dto, myUserId)),
    total: response.meta.total,
  };
}
