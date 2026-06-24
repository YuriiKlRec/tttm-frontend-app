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
import type { ResultGame, ResultBet } from '../mocks/results';
import type { WaitGame, WaitBet } from '../mocks/waitGames';
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
  now: number = Date.now(),
): 'won' | 'lost' | 'processing' | 'cancelled' {
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
 * startTime: таймлайн починається від створення гри (createdAt).
 */
export function toGameCard(dto: GameDto, myUserId?: string | null): Game {
  // Таймлайн починається від створення гри
  const startTime = Date.parse(dto.createdAt);
  const betCloseTime = Date.parse(dto.ticketDeadlineAt);
  const endTime = Date.parse(dto.endTime);

  // Призовий фонд = ціна тікета × кількість тікетів (у nanoTON), обчислюється через BigInt для уникнення втрати точності
  const totalNano = Number(BigInt(dto.ticketAmount) * BigInt(dto.tickets.length));

  return {
    id: dto.id,
    title: dto.name,
    author: `@${dto.owner.nickname}`,
    ticketPrice: nanoToTon(dto.ticketAmount),
    prize: nanoToTon(totalNano),
    // Кількість тікетів поточного користувача; 0 якщо користувач анонімний (myUserId невизначено)
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
 * betOpenTime: таймлайн починається від створення гри (createdAt).
 */
export function toGameDetail(dto: GameDto, myUserId?: string | null): GameDetail {
  const createdAtMs = Date.parse(dto.createdAt);
  const ticketDeadlineMs = Date.parse(dto.ticketDeadlineAt);
  const endTimeMs = Date.parse(dto.endTime);

  // betOpenTime: таймлайн починається від створення гри
  const betOpenTime = createdAtMs;

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
    startTime: createdAtMs,
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

// ─────────────────────────────────────────
// toResultCard
// ─────────────────────────────────────────

/**
 * Перетворює GameDto у картку завершеної гри ResultGame.
 *
 * finishedAt: використовується finalizedAt якщо є, інакше endTime.
 * leader: тікет-переможець (winningTicket) якщо присутній.
 * mine: перший тікет поточного користувача; rank=0 — позиція невідома до бекенд-лідерборду.
 */
export function toResultCard(dto: GameDto, myUserId: string | null): ResultGame {
  const totalNano = Number(BigInt(dto.ticketAmount) * BigInt(dto.tickets.length));
  const reward = `${nanoToTon(totalNano)} TON`;
  const finishedAt = Date.parse(dto.finalizedAt ?? dto.endTime);
  const status = deriveResultState(dto, myUserId);
  const finalPrice =
    dto.oracleFinalPrice !== null ? centsToUsd(dto.oracleFinalPrice) : undefined;

  const ticketsCount = dto.tickets.filter(
    (t) => myUserId !== null && t.ownerId === myUserId,
  ).length;

  let leader: ResultBet | undefined;
  if (dto.winningTicket) {
    leader = {
      rank: 1,
      user: `@${dto.winningTicket.owner.nickname}`,
      price: centsToUsd(dto.winningTicket.price),
      mine: dto.winningTicket.ownerId === myUserId,
    };
  }

  // rank=0 означає невідому позицію — формула рейтингу делегується бекенду
  const myTicket =
    myUserId !== null
      ? dto.tickets.find((t) => t.ownerId === myUserId)
      : undefined;
  const mine: ResultBet | undefined = myTicket
    ? {
        rank: 0,
        user: `@${myTicket.owner?.nickname ?? 'user'}`,
        price: centsToUsd(myTicket.price),
        mine: true,
      }
    : undefined;

  return {
    id: dto.id,
    title: dto.name,
    author: `@${dto.owner.nickname}`,
    contractAddress: dto.tonData.contractAddress ?? '',
    status,
    reward,
    finishedAt,
    finalPrice,
    ticketsCount,
    leader,
    mine,
  };
}

// ─────────────────────────────────────────
// toWaitCard
// ─────────────────────────────────────────

/**
 * Перетворює GameDto у картку гри, що очікує фіналізації (WaitGame).
 *
 * PROVISIONAL: сортування тікетів за відстанню до livePriceCents (якщо надано)
 * або за createdAt у зростаючому порядку.
 * ОСТАТОЧНА формула рейтингу буде реалізована на стороні бекенду — замінити
 * цей порядок після появи лідерборд-ендпоінту.
 *
 * leader і mine — обов'язкові поля WaitGame; якщо тікетів немає, підставляємо
 * плейсхолдер із автора гри.
 */
export function toWaitCard(
  dto: GameDto,
  myUserId: string | null,
  livePriceCents?: number,
): WaitGame {
  const totalNano = Number(BigInt(dto.ticketAmount) * BigInt(dto.tickets.length));
  const reward = `${nanoToTon(totalNano)} TON`;

  // PROVISIONAL: сортування тікетів — за близькістю до livePriceCents або за часом
  const sortedTickets = [...dto.tickets].sort((a, b) => {
    if (livePriceCents !== undefined) {
      return Math.abs(a.price - livePriceCents) - Math.abs(b.price - livePriceCents);
    }
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });

  const topTicket = sortedTickets[0];
  const myTicket =
    myUserId !== null ? sortedTickets.find((t) => t.ownerId === myUserId) : undefined;
  const myRank = myTicket ? sortedTickets.indexOf(myTicket) + 1 : 0;

  // Плейсхолдер-лідер і ставка з автора гри, якщо тікетів немає
  const fallbackBet: WaitBet = {
    rank: 1,
    user: `@${dto.owner.nickname}`,
    price: livePriceCents !== undefined ? centsToUsd(livePriceCents) : '$0.00',
    mine: dto.owner.id === myUserId,
  };

  const leader: WaitBet = topTicket
    ? {
        rank: 1,
        user: `@${topTicket.owner.nickname}`,
        price: centsToUsd(topTicket.price),
        mine: topTicket.ownerId === myUserId,
      }
    : fallbackBet;

  const mine: WaitBet = myTicket
    ? {
        rank: myRank,
        user: `@${myTicket.owner?.nickname ?? 'user'}`,
        price: centsToUsd(myTicket.price),
        mine: true,
      }
    : fallbackBet;

  return {
    id: dto.id,
    title: dto.name,
    author: `@${dto.owner.nickname}`,
    reward,
    startTime: Date.parse(dto.createdAt),
    betCloseTime: Date.parse(dto.ticketDeadlineAt),
    endTime: Date.parse(dto.endTime),
    leader,
    mine,
  };
}
