/**
 * Маперна функція для перетворення backend DTO → view-моделі.
 *
 * Підтримувані перетворення:
 *   GameDto → Game (картка гри)
 *   GameDto → GameDetail (детальна сторінка)
 *   TicketDto → Bet (рядок ставки)
 *
 * Одиниці:
 *   nanoTON → TON-рядок через nanoToTon
 *   центи → USD-рядок через centsToUsd
 *   ISO-рядок → epoch ms через Date.parse
 */

import type { GameDto } from './dto/game.dto';
import type { TicketDto } from './dto/ticket.dto';
import type { Game, GameDetail, Bet } from '../types/game';
import { nanoToTon, centsToUsd } from '../utils/units';

// ─────────────────────────────────────────
// derivePhase
// ─────────────────────────────────────────

/**
 * Визначає поточну фазу гри відносно `now` (epoch ms).
 *
 *   active    — дедлайн ставок ще не настав
 *   waiting   — ставки закрито, гра ще не завершена
 *   finished  — endTime минув
 */
export function derivePhase(
  dto: GameDto,
  now: number,
): 'active' | 'waiting' | 'finished' {
  const deadline = Date.parse(dto.ticketDeadlineAt);
  const end = Date.parse(dto.endTime);

  if (end <= now) return 'finished';
  if (deadline <= now) return 'waiting';
  return 'active';
}

// ─────────────────────────────────────────
// deriveResultState
// ─────────────────────────────────────────

/**
 * Визначає стан результату гри для конкретного користувача.
 *
 *   won        — гра фіналізована, переможець = myUserId
 *   lost       — гра фіналізована, переможець ≠ myUserId
 *   processing — endTime < now, але isFinalized = false (є тікети)
 *   cancelled  — немає тікетів / не оплачено / немає переможця
 */
export function deriveResultState(
  dto: GameDto,
  myUserId: string | null,
): 'won' | 'lost' | 'processing' | 'cancelled' {
  const now = Date.now();
  const end = Date.parse(dto.endTime);

  if (dto.isFinalized && dto.winningTicket !== null) {
    return dto.winningTicket.ownerId === myUserId ? 'won' : 'lost';
  }

  if (end < now && !dto.isFinalized && dto.tickets.length > 0) {
    return 'processing';
  }

  return 'cancelled';
}

// ─────────────────────────────────────────
// toGameCard
// ─────────────────────────────────────────

/**
 * Перетворює GameDto у модель картки Game.
 *
 * startTime: бекенд не повертає окремого startTime у GameDto —
 * використовуємо ticketDeadlineAt як найраніший відомий орієнтир
 * для таймлайну (тобто startTime = ticketDeadlineAt). Коментар
 * залишений навмисно для майбутнього виправлення, якщо бекенд
 * додасть поле.
 */
export function toGameCard(dto: GameDto, myUserId?: string | null): Game {
  // startTime: GameDto не має createdAt/startTime → беремо ticketDeadlineAt.
  // Таймлайн картки починається з того самого моменту що й закривається.
  const startTime = Date.parse(dto.ticketDeadlineAt);
  const betCloseTime = Date.parse(dto.ticketDeadlineAt);
  const endTime = Date.parse(dto.endTime);

  // Призовий фонд = ціна тікета × кількість тікетів (у nanoTON).
  const totalNano = dto.ticketAmount * dto.tickets.length;

  return {
    id: dto.id,
    title: dto.name,
    author: `@${dto.owner.nickname}`,
    ticketPrice: nanoToTon(dto.ticketAmount),
    prize: nanoToTon(totalNano),
    ticketsCount: dto.tickets.filter(
      (t) => myUserId !== undefined && myUserId !== null && t.ownerId === myUserId,
    ).length,
    startTime,
    betCloseTime,
    endTime,
    isAuthor: myUserId !== undefined && myUserId !== null
      ? dto.owner.id === myUserId
      : undefined,
  };
}

// ─────────────────────────────────────────
// toGameDetail
// ─────────────────────────────────────────

/**
 * Перетворює GameDto у детальну модель GameDetail.
 *
 * betOpenTime: GameDto не містить поля startTime →
 * встановлюємо betOpenTime = ticketDeadlineAt (ліва межа жовтої колонки
 * збігається з правою, колонка буде нульової ширини).
 * Якщо бекенд додасть startTime — замінити тут.
 */
export function toGameDetail(dto: GameDto, myUserId?: string | null): GameDetail {
  const ticketDeadlineMs = Date.parse(dto.ticketDeadlineAt);
  const endTimeMs = Date.parse(dto.endTime);

  // betOpenTime: немає окремого поля у DTO → betOpenTime = ticketDeadlineAt.
  const betOpenTime = ticketDeadlineMs;

  const myTicketPrices = dto.tickets
    .filter((t) => myUserId !== undefined && myUserId !== null && t.ownerId === myUserId)
    .map((t) => t.price / 100); // nanoTON → TON? Ні: тут price є BTC-прогноз у центах → ділимо на 100

  const otherTicketPrices = dto.tickets
    .filter((t) => !(myUserId !== undefined && myUserId !== null && t.ownerId === myUserId))
    .map((t) => t.price / 100);

  return {
    id: dto.id,
    name: dto.name,
    ticketPrice: nanoToTon(dto.ticketAmount),
    startTime: betOpenTime, // використовуємо як найраннішу відому точку
    betOpenTime,
    betCloseTime: ticketDeadlineMs,
    endTime: endTimeMs,
    takenByOthers: otherTicketPrices,
    yourTickets: myTicketPrices,
  };
}

// ─────────────────────────────────────────
// toBet
// ─────────────────────────────────────────

/** Опції для toBet: ранг і варіант відображення рядка. */
export interface ToBetOpts {
  /** Порядковий ранг у списку (1..N) — визначається на рівні виклику. */
  rank: number;
  /** Чи є ставка виграшною. */
  win: boolean;
  /** Чи належить ставка поточному користувачу. */
  mine: boolean;
  /**
   * Фінальна ціна оракула у центах (×100).
   * Якщо передано — відображається замість ціни тікета (для рядка результату).
   */
  finalPrice?: number;
}

/**
 * Перетворює TicketDto у рядок ставки Bet.
 *
 * price: TicketDto.price — BTC-прогноз у центах (×100), тому форматуємо
 * через centsToUsd. Результат: "$57,212.46".
 */
export function toBet(ticket: TicketDto, opts: ToBetOpts): Bet {
  const variant = opts.win ? 'win' : opts.mine ? 'mine' : 'default';
  const user = `@${ticket.owner?.nickname ?? 'user'}`;
  const priceInCents = opts.finalPrice !== undefined ? opts.finalPrice : ticket.price;
  const price = centsToUsd(priceInCents);

  return {
    rank: opts.rank,
    user,
    price,
    variant,
  };
}
