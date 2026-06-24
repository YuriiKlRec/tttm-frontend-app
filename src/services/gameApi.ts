/**
 * HTTP-клієнт для ресурсу /api/games.
 *
 * Функції:
 *   getGame                — деталі однієї гри
 *   listPredictions        — список активних ігор (вкладка Predictions)
 *   listWaiting            — список ігор у фазі очікування (вкладка Waiting)
 *   listResults            — список завершених ігор (вкладка Results)
 *   createGameTransaction  — підготовка TON-транзакції для створення гри
 *   createGame             — збереження гри у БД після підтвердження транзакції
 */

import { get, post } from './http';
import { toGameDetail, toGameCard, toResultCard, toWaitCard } from './mappers';
import type { GameDto, Paginated } from './dto/game.dto';
import type { GameDetail, Game } from '../types/game';
import type { ResultGame } from '../types/results';
import type { WaitGame } from '../types/wait';

// ─── DTO для транзакції та створення гри ────────────────────────────────────

/** Тіло запиту POST /api/games/transaction. */
export interface CreateGameTransactionReq {
  /** Адреса гаманця власника (raw-формат). */
  owner: string;
  name: string;
  /** ISO-рядок часу завершення гри. */
  endTime: string;
  /** ISO-рядок дедлайну прийому ставок. */
  ticketDeadline: string;
  /** Ціна квитка у nanoTON (int). */
  ticketAmount: number;
  /** Відсоток автора (1-30). */
  authorPercent: number;
  /** Зарезервований contractGameId (для повторної оплати). */
  gameId?: number;
}

/** Відповідь POST /api/games/transaction. */
export interface CreateGameTransactionResp {
  valid: boolean;
  to: string;
  /** Вартість транзакції у nanoTON (рядок). */
  value: string;
  payload: string;
  stateInit: string | null;
  contractAddress: string;
  /** Зарезервований ідентифікатор гри у контракті. */
  gameId: number;
}

/** tonData для POST /api/games. */
interface GameTonData {
  network: 'mainnet' | 'testnet';
  contractAddress: string;
}

/** Тіло запиту POST /api/games. */
export interface CreateGameReq {
  name: string;
  targetCurrency: 'BTCUSDT';
  /** Опис гри. Колонка БД NOT NULL — надсилаємо хоча б порожній рядок. */
  description: string;
  /** Ціна квитка у nanoTON (int). */
  ticketAmount: number;
  authorPercent: number;
  /** ISO-рядок часу завершення гри. */
  endTime: string;
  /** ISO-рядок дедлайну прийому ставок. */
  ticketDeadlineAt: string;
  walletAddress: string;
  isPublic: boolean;
  /** Ідентифікатор гри у контракті (з createGameTransaction). */
  contractGameId: number;
  tonData: GameTonData;
}

/** Відповідь POST /api/games (скорочена — потрібен лише id для навігації). */
export interface CreatedGameResp {
  id: string;
}

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

// ─── Транзакція + створення гри ──────────────────────────────────────────────

/**
 * Підготовка TON-транзакції для деплою контракту гри.
 * Повертає адресу, суму та payload для sendTransaction.
 *
 * @param req — параметри гри (власник, назва, часи, ціна квитка, відсоток)
 */
export async function createGameTransaction(
  req: CreateGameTransactionReq,
): Promise<CreateGameTransactionResp> {
  return post<CreateGameTransactionResp>('/api/games/transaction', req);
}

/**
 * Зберігає гру у БД після підтвердження TON-транзакції.
 * Повертає об'єкт з id нової гри для навігації.
 *
 * @param req — дані гри + contractGameId + tonData з відповіді транзакції
 */
export async function createGame(req: CreateGameReq): Promise<CreatedGameResp> {
  return post<CreatedGameResp>('/api/games', req);
}
