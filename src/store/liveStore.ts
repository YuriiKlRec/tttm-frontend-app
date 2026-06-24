/**
 * Zustand-стор для real-time стану ігор.
 *
 * Зберігає:
 *   games          — Map<gameId, GameDetail> (оновлюється через ingest)
 *   ticketsByGame  — Map<gameId, Bet[]> (живі ставки кімнати)
 *   myUserId       — id поточного користувача для mine/win-логіки
 */

import { create } from 'zustand';
import { centsToUsd } from '../utils/units';
import type { GameDetail, Bet } from '../types/game';

// ─────────────────────────────────────────
// Socket-payload інтерфейси (ТОЧНА форма emit-ів бекенду)
// Джерело: backend/src/websocket/events.ts
// ─────────────────────────────────────────

/**
 * Payload подій game:updated / game:finalized / game:claimed.
 * Поля відповідають GameEventData у backend/src/websocket/events.ts:
 *   id, name, status, endTime(Date), isFinalized, isClaimed,
 *   totalAmount(string), authorPercent(number), ticketAmount(number),
 *   winningTicketId?(string)
 * Відсутні у socket-об'єкті: owner, tickets, ticketDeadlineAt, createdAt,
 * oracleFinalPrice, winningTicket, tonData.
 */
interface GameSocketPayload {
  gameId: string;
  game: {
    id: string;
    name: string;
    status: string;
    /** Date-об'єкт або ISO-рядок, залежно від серіалізатора Socket.IO. */
    endTime: Date | string;
    isFinalized: boolean;
    isClaimed: boolean;
    totalAmount: string;
    authorPercent: number;
    ticketAmount: number;
    winningTicketId?: string;
  };
  timestamp: Date | string;
}

/**
 * Payload події game:ticket_added.
 * Поля відповідають GameTicketAddedData у backend/src/websocket/events.ts:
 *   gameId, ticket.{ id, userId, price(string cents), winningPrice(string) },
 *   totalTickets, totalAmount.
 * Увага: userId (НЕ ownerId), price — рядок центів.
 */
interface TicketAddedSocketPayload {
  gameId: string;
  ticket: {
    id: string;
    /** ID власника тікета (НЕ ownerId — саме userId). */
    userId: string;
    /** BTC-прогноз у центах, передається як рядок. */
    price: string;
    winningPrice: string;
  };
  totalTickets: number;
  totalAmount: string;
}

/**
 * Payload події ticket:created.
 * Поля відповідають TicketEventData у backend/src/websocket/events.ts:
 *   ticketId, gameId, userId, ticket.{ id, price(string cents), winningPrice, createdAt }.
 * Нікнейм власника відсутній у socket-payload — використовуємо нейтральний лейбл.
 */
interface TicketCreatedSocketPayload {
  ticketId: string;
  gameId: string;
  userId: string;
  ticket: {
    id: string;
    /** BTC-прогноз у центах, передається як рядок. */
    price: string;
    winningPrice: string;
    createdAt: Date | string;
  };
}

// ─────────────────────────────────────────
// Чисті хендлери (без стор-залежностей)
// ─────────────────────────────────────────

/**
 * Обробляє події game:updated / game:finalized / game:claimed.
 *
 * Стратегія: мерж часткового патча в ІСНУЮЧИЙ GameDetail.
 * Якщо гра відсутня у сторі (користувач її не переглядає) — ігноруємо подію,
 * щоб не конструювати неповний GameDetail із урізаного socket-об'єкта.
 *
 * Оновлювані поля (лише ті, що присутні у socket-payload):
 *   endTime, winningTicketId, isFinalized → phase-підказки для UI,
 *   isClaimed — статус виплати.
 */
export function applyGameUpdated(
  games: Map<string, GameDetail>,
  payload: GameSocketPayload,
): Map<string, GameDetail> {
  const existing = games.get(payload.gameId);
  // Якщо гра відсутня у сторі — ігноруємо подію (користувач її не переглядає)
  if (!existing) return games;

  const endTime =
    typeof payload.game.endTime === 'string'
      ? Date.parse(payload.game.endTime)
      : payload.game.endTime instanceof Date
        ? payload.game.endTime.getTime()
        : existing.endTime;

  const patched: GameDetail = {
    ...existing,
    endTime,
    winningTicketId: payload.game.winningTicketId ?? existing.winningTicketId,
  };

  const next = new Map(games);
  next.set(payload.gameId, patched);
  return next;
}

/**
 * Будує Bet із socket-payload ticket_added / ticket_created.
 *
 * price — рядок центів (НЕ множимо на 100; centsToUsd(Number(price)) — правильно).
 * Нікнейм відсутній у socket-payload → нейтральний лейбл '@user'.
 */
function buildBetFromSocket(
  _ticketId: string,
  userId: string,
  priceCentsStr: string,
  rank: number,
  myUserId: string | null,
  myNickname: string | null,
): Bet {
  const mine = userId === myUserId;
  // Нікнейм власника відсутній у socket-payload. Для СВОЇХ ставок підставляємо
  // нік поточного користувача; для чужих — нейтральний '@user' (уточниться при
  // наступному рефетчі списку через REST, де owner.nickname присутній).
  const user = mine && myNickname ? `@${myNickname}` : '@user';
  // price — рядок центів → конвертуємо напряму (не множимо повторно)
  const price = centsToUsd(Number(priceCentsStr));
  const variant = mine ? 'mine' : 'default';

  return { rank, user, price, variant };
}

/**
 * Обробляє подію game:ticket_added — додає Bet у кінець списку.
 */
export function applyTicketAdded(
  ticketsByGame: Map<string, Bet[]>,
  payload: TicketAddedSocketPayload,
  myUserId: string | null,
  myNickname: string | null,
): Map<string, Bet[]> {
  const existing = ticketsByGame.get(payload.gameId) ?? [];
  const bet = buildBetFromSocket(
    payload.ticket.id,
    payload.ticket.userId,
    payload.ticket.price,
    existing.length + 1,
    myUserId,
    myNickname,
  );
  const next = new Map(ticketsByGame);
  next.set(payload.gameId, [...existing, bet]);
  return next;
}

/**
 * Обробляє подію ticket:created — додає Bet у кінець списку.
 */
export function applyTicketCreated(
  ticketsByGame: Map<string, Bet[]>,
  payload: TicketCreatedSocketPayload,
  myUserId: string | null,
  myNickname: string | null,
): Map<string, Bet[]> {
  const existing = ticketsByGame.get(payload.gameId) ?? [];
  const bet = buildBetFromSocket(
    payload.ticket.id,
    payload.userId,
    payload.ticket.price,
    existing.length + 1,
    myUserId,
    myNickname,
  );
  const next = new Map(ticketsByGame);
  next.set(payload.gameId, [...existing, bet]);
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
  /** Нік поточного користувача — для підпису СВОЇХ live-ставок (socket не шле нік). */
  myNickname: string | null;
  /** Кількість підключених користувачів (оновлюється через stats:updated). */
  connectedUsers: number;
  /** true, якщо WebSocket-з'єднання активне. */
  socketConnected: boolean;
  setGame: (d: GameDetail) => void;
  setMyUserId: (id: string | null, nickname?: string | null) => void;
  ingest: (event: { type: string; payload: unknown }) => void;
  /** Оновлює кількість підключених користувачів із stats:updated. */
  setConnectedUsers: (n: number) => void;
  /** Оновлює стан WebSocket-з'єднання. */
  setSocketConnected: (b: boolean) => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  games: new Map(),
  ticketsByGame: new Map(),
  myUserId: null,
  myNickname: null,
  connectedUsers: 0,
  socketConnected: false,

  /** Встановлює або оновлює GameDetail у сторі за id. */
  setGame(d) {
    set((state) => {
      const next = new Map(state.games);
      next.set(d.id, d);
      return { games: next };
    });
  },

  /** Оновлює myUserId + нік (викликається AuthProvider-ом при логіні). */
  setMyUserId(id, nickname = null) {
    set({ myUserId: id, myNickname: nickname });
  },

  /** Оновлює кількість підключених користувачів (з events stats:updated). */
  setConnectedUsers(n) {
    set({ connectedUsers: n });
  },

  /** Оновлює прапор активності WebSocket-з'єднання. */
  setSocketConnected(b) {
    set({ socketConnected: b });
  },

  /**
   * Диспетчер real-time подій.
   * Підтримувані типи: game:updated, game:finalized, game:claimed,
   *                    game:ticket_added, ticket:created.
   * Використовуємо функціональну форму set(), щоб уникнути race read-then-set.
   */
  ingest({ type, payload }) {
    switch (type) {
      case 'game:updated':
      case 'game:finalized':
      case 'game:claimed': {
        const p = payload as GameSocketPayload;
        set((state) => ({ games: applyGameUpdated(state.games, p) }));
        break;
      }
      case 'game:ticket_added': {
        const p = payload as TicketAddedSocketPayload;
        set((state) => ({
          ticketsByGame: applyTicketAdded(state.ticketsByGame, p, state.myUserId, state.myNickname),
        }));
        break;
      }
      case 'ticket:created': {
        const p = payload as TicketCreatedSocketPayload;
        set((state) => ({
          ticketsByGame: applyTicketCreated(state.ticketsByGame, p, state.myUserId, state.myNickname),
        }));
        break;
      }
      default:
        break;
    }
  },
}));
