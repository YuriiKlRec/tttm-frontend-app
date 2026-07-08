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
  const priceCents = Number(priceCentsStr);
  const price = centsToUsd(priceCents);
  const variant = mine ? 'mine' : 'default';

  // createdAt — момент отримання події (точний час створення прийде при рефетчі)
  return { rank, user, price, variant, mine, priceCents, createdAt: Date.now() };
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

/**
 * Домішує підтверджено-мої ціни (щойно оплачені) у GameDetail: гарантує, що
 * `yourTickets` завжди містить кожну підтверджену ціну, а `takenByOthers`
 * ніколи її не містить — незалежно від того, що прийшло у самому знімку
 * (REST-рефетч чи стара/кешована відповідь).
 *
 * Навіщо: `setGame` — unconditional replace усього GameDetail (див. нижче), і
 * REST-відповіді можуть прийти ПОЗА ЧЕРГОЮ (напр. застарілий fetch з
 * попереднього mount /game/:id, що розв'язався пізніше свіжого — класична
 * гонка з несканельованим async-ефектом; є й окремий фікс у useGameLive.ts)
 * АБО бути кешованими на бекенді з лагом. Обидва випадки — поза контролем
 * фронтенду в момент REST-виклику, тож гарантія «мій щойно куплений тікет
 * ніколи не показується зайнятим» тримається ТУТ, на рівні мержу, а не лише
 * на рівні коректного порядку fetch-ів.
 */
export function mergeConfirmedMine(detail: GameDetail, confirmed: Set<number> | undefined): GameDetail {
  if (!confirmed || confirmed.size === 0) return detail;

  const toCents = (price: number): number => Math.round(price * 100);
  const yourCentsSet = new Set(detail.yourTickets.map(toCents));
  const missingPrices = Array.from(confirmed)
    .filter((cents) => !yourCentsSet.has(cents))
    .map((cents) => cents / 100);

  return {
    ...detail,
    yourTickets: missingPrices.length > 0 ? [...detail.yourTickets, ...missingPrices] : detail.yourTickets,
    takenByOthers: detail.takenByOthers.filter((price) => !confirmed.has(toCents(price))),
  };
}

// ─────────────────────────────────────────
// Стан і стор
// ─────────────────────────────────────────

export interface LiveState {
  games: Map<string, GameDetail>;
  ticketsByGame: Map<string, Bet[]>;
  /**
   * Ціни, щойно ОПЛАЧЕНІ поточним користувачем, за gameId (у центах — ціле
   * число, уникає похибок float при порівнянні). Заповнюється з
   * useBuyTicketsFlow одразу після успішного createTickets і НІКОЛИ не
   * очищується під час сесії гри — кожен наступний setGame() домішує ці ціни
   * у yourTickets/takenByOthers (mergeConfirmedMine), тож «оплачено» не може
   * відкотитися застарілим/кешованим знімком гри.
   */
  myConfirmedTicketsByGame: Map<string, Set<number>>;
  /** Id поточного користувача; встановлюється ззовні (провайдером). */
  myUserId: string | null;
  /** Нік поточного користувача — для підпису СВОЇХ live-ставок (socket не шле нік). */
  myNickname: string | null;
  /** Кількість підключених користувачів (оновлюється через stats:updated). */
  connectedUsers: number;
  /** true, якщо WebSocket-з'єднання активне. */
  socketConnected: boolean;
  /** Лічильник-сигнал оновлення лідерборду (інкремент на подію leaderboard:updated). */
  leaderboardVersion: number;
  setGame: (d: GameDetail) => void;
  /** Позначає ціну як щойно оплачену МНОЮ у грі gameId (захист від гонки/кешу). */
  confirmMyTicket: (gameId: string, price: number) => void;
  setMyUserId: (id: string | null, nickname?: string | null) => void;
  ingest: (event: { type: string; payload: unknown }) => void;
  /** Оновлює кількість підключених користувачів із stats:updated. */
  setConnectedUsers: (n: number) => void;
  /** Оновлює стан WebSocket-з'єднання. */
  setSocketConnected: (b: boolean) => void;
  /** Інкрементує leaderboardVersion — тригер рефетчу лідерборду (realtime). */
  bumpLeaderboard: () => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  games: new Map(),
  ticketsByGame: new Map(),
  myConfirmedTicketsByGame: new Map(),
  myUserId: null,
  myNickname: null,
  connectedUsers: 0,
  socketConnected: false,
  leaderboardVersion: 0,

  /**
   * Встановлює або оновлює GameDetail у сторі за id. Перед записом домішує
   * підтверджено-мої ціни (myConfirmedTicketsByGame) — див. mergeConfirmedMine.
   */
  setGame(d) {
    set((state) => {
      const confirmed = state.myConfirmedTicketsByGame.get(d.id);
      const next = new Map(state.games);
      next.set(d.id, mergeConfirmedMine(d, confirmed));
      return { games: next };
    });
  },

  /**
   * Позначає ціну як щойно оплачену мною: додає у ledger І одразу мержить у
   * вже закешований GameDetail (якщо є), щоб UI оновився негайно, не чекаючи
   * наступного setGame().
   */
  confirmMyTicket(gameId, price) {
    set((state) => {
      const priceCents = Math.round(price * 100);
      const prevSet = state.myConfirmedTicketsByGame.get(gameId);
      const nextSet = new Set(prevSet);
      nextSet.add(priceCents);
      const nextConfirmed = new Map(state.myConfirmedTicketsByGame);
      nextConfirmed.set(gameId, nextSet);

      const existing = state.games.get(gameId);
      if (!existing) {
        return { myConfirmedTicketsByGame: nextConfirmed };
      }
      const nextGames = new Map(state.games);
      nextGames.set(gameId, mergeConfirmedMine(existing, nextSet));
      return { myConfirmedTicketsByGame: nextConfirmed, games: nextGames };
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

  /** Інкрементує сигнал оновлення лідерборду (подія leaderboard:updated). */
  bumpLeaderboard() {
    set((state) => ({ leaderboardVersion: state.leaderboardVersion + 1 }));
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
