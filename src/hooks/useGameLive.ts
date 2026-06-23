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
 * @param id - ідентифікатор гри
 * @returns game — поточний GameDetail зі стора (null до першого fetch)
 * @returns ready — true після завершення початкового завантаження
 */
export function useGameLive(id: string): { game: GameDetail | null; ready: boolean } {
  const [ready, setReady] = useState(false);
  // Захист від повторного fetch у StrictMode (подвійний mount)
  const fetchedRef = useRef(false);

  const setGame = useLiveStore((s) => s.setGame);
  const game = useLiveStore((s) => s.games.get(id) ?? null);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const init = async (): Promise<void> => {
      try {
        const detail = await getGame(id);
        setGame(detail);
      } finally {
        setReady(true);
      }
    };

    void init();

    // Підключаємо socket і входимо в кімнату гри
    const token = getStoredAccessToken();
    connectRealtime(token);
    joinGame(id);

    return () => {
      leaveGame(id);
      // Socket залишається відкритим — disconnectRealtime() викликається тільки при логауті
    };
  }, [id, setGame]);

  return { game, ready };
}
