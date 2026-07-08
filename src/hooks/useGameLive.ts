/**
 * Хук useGameLive — підписка на real-time оновлення конкретної гри.
 *
 * При монтуванні:
 *   1. GET /api/games/:id → setGame (початковий стан із бекенду)
 *   2. connectRealtime(token) — ініціює shared socket (якщо ще не підключено)
 *   3. joinGame(id) — входить у кімнату гри
 *
 * При розмонтуванні:
 *   leaveGame(id) — виходить із кімнати (socket НЕ закривається глобально)
 *
 * ready = true після завершення першого fetch (незалежно від результату).
 */

import { useEffect, useRef, useState } from 'react';
import { getStoredAccessToken } from '../services/token-storage';
import { getGame } from '../services/gameApi';
import { connectRealtime, joinGame, leaveGame } from '../services/realtime';
import { useLiveStore } from '../store/liveStore';
import type { GameDetail } from '../types/game';

/**
 * @param id       — ідентифікатор гри
 * @param myUserId — ID поточного користувача; якщо передано, yourTickets
 *                   та takenByOthers у GameDetail заповнюються коректно
 * @returns game — поточний GameDetail зі стора (null до першого fetch)
 * @returns ready — true після завершення початкового завантаження
 */
export function useGameLive(
  id: string,
  myUserId?: string | null,
): { game: GameDetail | null; ready: boolean } {
  const [ready, setReady] = useState(false);
  // Захист від подвійного join у StrictMode — окремий ref для socket-операцій
  const joinedRef = useRef(false);

  const setGame = useLiveStore((s) => s.setGame);
  const game = useLiveStore((s) => s.games.get(id) ?? null);

  useEffect(() => {
    // cancelled — стандартний React-патерн "ignore stale response" (той самий,
    // що й у BuyTicketsPage.tsx для fetchedGame): якщо ефект перезапускається
    // (реальний unmount+remount — напр. користувач іде на /buy й повертається
    // НАЗАД до того самого /game/:id — АБО синтетичний подвійний виклик
    // StrictMode у dev), попередній fetch не скасовується мережею — його
    // .then() все одно спрацює пізніше. Без цього прапорця пізня відповідь
    // ПОПЕРЕДНЬОГО виклику unconditionally викликала б setGame() зі
    // ЗАСТАРІЛИМ знімком (напр. без щойно купленого тікета), перезаписуючи
    // свіжий стан від нового fetch — саме такий механізм лежить в основі
    // «оплачено, але показує зайняту чужу» (див. round12-report.md, п.5).
    //
    // ВАЖЛИВО: раніше тут був fetchedRef-гейт ("не рефетчити у StrictMode"),
    // який ЛАМАВ саме цей cancelled-патерн — StrictMode виконує ефект двічі
    // (mount→cleanup→mount) на ОДНОМУ логічному екрані, і fetchedRef.current,
    // будучи ref-ом (переживає подвійний виклик), блокував ДРУГИЙ виклик від
    // старту власного fetch, тоді як cleanup ПЕРШОГО виклику вже встиг
    // виставити cancelled=true — відповідь єдиного fetch губилась назавжди,
    // ready ніколи не ставало true. Прибрано: подвійний fetch у dev-режимі —
    // прийнятна, добре задокументована ціна стандартного React-патерну
    // (у продакшн-білді StrictMode подвійного виклику не робить).
    let cancelled = false;

    const init = async (): Promise<void> => {
      try {
        const detail = await getGame(id, myUserId);
        if (!cancelled) setGame(detail);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void init();

    // Підключаємо socket і входимо в кімнату гри (один раз, захист від StrictMode)
    if (!joinedRef.current) {
      joinedRef.current = true;
      const token = getStoredAccessToken();
      connectRealtime(token);
      joinGame(id);
    }

    return () => {
      cancelled = true;
      leaveGame(id);
      // Скидаємо joinedRef, щоб реальний remount міг переприєднатись
      joinedRef.current = false;
      // Socket залишається відкритим — disconnectRealtime() викликається тільки при логауті
    };
  }, [id, myUserId, setGame]);

  return { game, ready };
}
