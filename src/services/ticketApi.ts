/**
 * HTTP-клієнт для ресурсів /api/tickets.
 *
 * Функції:
 *   prepareTicketTx — підготовка TON-транзакції для купівлі квитків
 *   createTickets   — збереження квитків у БД після підтвердження транзакції
 *
 * Список ставок гри більше не завантажується окремим пагінованим запитом —
 * повний набір тікетів приходить у відповіді GET /api/games/:id (toGameDetail.allBets).
 */

import { post } from './http';

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

