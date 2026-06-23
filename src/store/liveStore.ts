/**
 * Zustand-стор для real-time стану ігор.
 *
 * Зберігає:
 *   games          — Map<gameId, GameDetail> (оновлюється через ingest)
 *   ticketsByGame  — Map<gameId, Bet[]> (живі ставки кімнати)
 *   myUserId       — id поточного користувача для mine/win-логіки
 */

import { create } from 'zustand';
import { toGameDetail, toBet } from '../services/mappers';
import type { GameDto } from '../services/dto/game.dto';
import type { TicketDto } from '../services/dto/ticket.dto';
import type { GameDetail, Bet } from '../types/game';

// ─────────────────────────────────────────
// Типи подій (звужені payload-и з сервера)
// ─────────────────────────────────────────

/** Payload подій game:updated / game:finalized / game:claimed. */
interface GameEventPayload {
  gameId: string;
  game: GameDto;
  timestamp?: string;
}

/** Payload події game:ticket_added. */
interface TicketAddedPayload {
  gameId: string;
  ticket: TicketDto;
  totalTickets: number;
  totalAmount?: number;
}

/** Payload події ticket:created. */
interface TicketCreatedPayload {
  ticketId: string;
  gameId: string;
  userId: string;
  ticket: TicketDto;
}

// ─────────────────────────────────────────
// Чисті хендлери (без стор-залежностей)
// ─────────────────────────────────────────

/**
 * Обробляє події game:updated / game:finalized / game:claimed.
 * Повертає нову Map<string, GameDetail> для мержу в стан.
 */
export function applyGameUpdated(
  games: Map<string, GameDetail>,
  payload: GameEventPayload,
  myUserId: string | null,
): Map<string, GameDetail> {
  const next = new Map(games);
  next.set(payload.gameId, toGameDetail(payload.game, myUserId));
  return next;
}

/**
 * Обробляє подію game:ticket_added — додає Bet у кінець списку.
 * mine = ticket.ownerId === myUserId
 * win  = false (переможець невідомий до фіналізації)
 * rank = поточна довжина + 1
 */
export function applyTicketAdded(
  ticketsByGame: Map<string, Bet[]>,
  ticket: TicketDto,
  gameId: string,
  myUserId: string | null,
): Map<string, Bet[]> {
  const existing = ticketsByGame.get(gameId) ?? [];
  const bet = toBet(ticket, {
    rank: existing.length + 1,
    win: false,
    mine: ticket.ownerId === myUserId,
  });
  const next = new Map(ticketsByGame);
  next.set(gameId, [...existing, bet]);
  return next;
}

// ─────────────────────────────────────────
// Стан і стор
// ─────────────────────────────────────────

export interface LiveState {
  games: Map<string, GameDetail>;
  ticketsByGame: Map<string, Bet[]>;
  /** Id поточного користувача; встановлюється ззовні (провайдером). */
  myUserId: string | null;
  setGame: (d: GameDetail) => void;
  setMyUserId: (id: string | null) => void;
  appendTickets: (gameId: string, bets: Bet[]) => void;
  ingest: (event: { type: string; payload: unknown }) => void;
}

export const useLiveStore = create<LiveState>((set, get) => ({
  games: new Map(),
  ticketsByGame: new Map(),
  myUserId: null,

  /** Встановлює або оновлює GameDetail у сторі за id. */
  setGame(d) {
    set((state) => {
      const next = new Map(state.games);
      next.set(d.id, d);
      return { games: next };
    });
  },

  /** Оновлює myUserId (викликається AuthProvider-ом при логіні). */
  setMyUserId(id) {
    set({ myUserId: id });
  },

  /** Додає масив Bet до кінця списку для gameId (bulk-append). */
  appendTickets(gameId, bets) {
    set((state) => {
      const existing = state.ticketsByGame.get(gameId) ?? [];
      const next = new Map(state.ticketsByGame);
      next.set(gameId, [...existing, ...bets]);
      return { ticketsByGame: next };
    });
  },

  /**
   * Диспетчер real-time подій.
   * Підтримувані типи: game:updated, game:finalized, game:claimed,
   *                    game:ticket_added, ticket:created.
   */
  ingest({ type, payload }) {
    const { myUserId, games, ticketsByGame } = get();

    switch (type) {
      case 'game:updated':
      case 'game:finalized':
      case 'game:claimed': {
        const p = payload as GameEventPayload;
        set({ games: applyGameUpdated(games, p, myUserId) });
        break;
      }
      case 'game:ticket_added': {
        const p = payload as TicketAddedPayload;
        set({ ticketsByGame: applyTicketAdded(ticketsByGame, p.ticket, p.gameId, myUserId) });
        break;
      }
      case 'ticket:created': {
        const p = payload as TicketCreatedPayload;
        set({ ticketsByGame: applyTicketAdded(ticketsByGame, p.ticket, p.gameId, myUserId) });
        break;
      }
      default:
        break;
    }
  },
}));
