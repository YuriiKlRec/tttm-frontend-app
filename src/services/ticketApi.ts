/**
 * HTTP-клієнт для ресурсів /api/tickets та /api/games/:id/tickets.
 *
 * Функції:
 *   listTickets     — сторінкований список ставок однієї гри
 *   prepareTicketTx — підготовка TON-транзакції для купівлі квитків
 *   createTickets   — збереження квитків у БД після підтвердження транзакції
 *   extractHash     — витягти transactionHash із BOC без авторизації
 */

import { get, post } from './http';
import { toBet } from './mappers';
import type { TicketDto } from './dto/ticket.dto';
import type { Bet } from '../types/game';
import type { PageResult } from './gameApi';

/** Пагінована відповідь бекенду для тікетів. */
interface TicketPage {
  data: TicketDto[];
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
}

/**
 * Завантажує сторінку тікетів гри з бекенду.
 *
 * Ранг: PROVISIONAL — порядковий індекс по сторінці (createdAt DESC від бекенду).
 * Остаточна формула рейтингу делегується бекенд-лідерборду — замінити після появи
 * відповідного ендпоінту.
 *
 * @param gameId          — ідентифікатор гри
 * @param page            — номер сторінки (1-based)
 * @param perPage         — кількість елементів на сторінку
 * @param mine            — якщо true, повертає лише тікети поточного користувача
 * @param myUserId        — ID поточного користувача (для mine/win-логіки)
 * @param winningTicketId — ID тікета-переможця (null або undefined → win=false для всіх)
 */
export async function listTickets(
  gameId: string,
  page: number,
  perPage: number,
  mine: boolean,
  myUserId: string | null,
  winningTicketId?: string | null,
): Promise<PageResult<Bet>> {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  });

  if (mine) {
    params.set('mine', 'true');
  }

  const response = await get<TicketPage>(`/api/games/${gameId}/tickets?${params.toString()}`);

  // Порядковий ранг: (page-1)*perPage + індекс + 1 (1-based)
  const baseRank = (page - 1) * perPage;

  const items: Bet[] = response.data.map((ticket, i) =>
    toBet(ticket, {
      rank: baseRank + i + 1,
      mine: ticket.ownerId === myUserId,
      win: winningTicketId != null ? ticket.id === winningTicketId : false,
    }),
  );

  return { items, total: response.meta.total };
}

// ─── Транзакції купівлі квитків ───────────────────────────────────────────────

/** Тіло запиту POST /api/tickets/transaction. */
export interface PrepareTicketTxReq {
  gameId: string;
  /** BTC-ціни прогнозів (raw-значення з корзини, одиниця як на бекенді). */
  prices: number[];
}

/** Відповідь POST /api/tickets/transaction. */
export interface PrepareTicketTxResp {
  to: string;
  /** Вартість транзакції у nanoTON (рядок). */
  value: string;
  payload: string;
  stateInit?: string | null;
  gameId: string;
  prices: number[];
  ticketCount: number;
  ticketAmount: number;
}

/** Тіло запиту POST /api/tickets. */
export interface CreateTicketsReq {
  gameId: string;
  prices: number[];
  /** BOC транзакції у base64 (з результату sendTransaction). */
  boc: string;
}

/** Один збережений тікет у відповіді POST /api/tickets. */
export interface SavedTicket {
  id: string;
  price: number;
  gameId: string;
  ownerId: string;
}

/** Відповідь POST /api/tickets. */
export interface CreateTicketsResp {
  message: string;
  tickets: SavedTicket[];
  transactionHash: string;
}

/** Відповідь POST /api/tickets/extract-hash. */
export interface ExtractHashResp {
  transactionHash: string;
}

/**
 * Підготовка TON-транзакції для купівлі квитків.
 * При 422 (ціна вже зайнята) кидає ValidationError.
 *
 * @param req — ідентифікатор гри та обрані ціни прогнозів
 */
export async function prepareTicketTx(req: PrepareTicketTxReq): Promise<PrepareTicketTxResp> {
  return post<PrepareTicketTxResp>('/api/tickets/transaction', req);
}

/**
 * Зберігає куплені квитки у БД після підтвердження TON-транзакції.
 *
 * @param req — ідентифікатор гри, ціни та BOC транзакції
 */
export async function createTickets(req: CreateTicketsReq): Promise<CreateTicketsResp> {
  return post<CreateTicketsResp>('/api/tickets', req);
}

/**
 * Витягує transactionHash із BOC (без авторизації).
 *
 * @param boc — BOC транзакції у base64
 */
export async function extractHash(boc: string): Promise<string> {
  const resp = await post<ExtractHashResp>('/api/tickets/extract-hash', { boc });
  return resp.transactionHash;
}
