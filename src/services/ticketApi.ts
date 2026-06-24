/**
 * HTTP-клієнт для ресурсу /api/games/:id/tickets.
 *
 * Функції:
 *   listTickets — сторінкований список ставок однієї гри
 */

import { get } from './http';
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
