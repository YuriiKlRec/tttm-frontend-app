/**
 * Хук useLeaderboard — завантажує лідерборд і оновлює його в реальному часі.
 *
 * Початковий запит — після готовності auth (ready). Перефетч — на зміну
 * leaderboardVersion у liveStore (інкрементується подією WebSocket
 * leaderboard:updated після фіналізації гри).
 */

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useLiveStore } from '../store/liveStore';
import { getLeaderboard } from '../services/leaderboardApi';
import type { Leader } from '../types/leaderboard';

/** Результат хука useLeaderboard. */
interface UseLeaderboardResult {
  leaders: Leader[];
  loading: boolean;
}

/**
 * Завантажує лідерборд після готовності auth та перефетчить його при
 * realtime-сигналі (leaderboardVersion). Гонки запитів скасовуються прапором cancelled.
 */
export function useLeaderboard(): UseLeaderboardResult {
  const { ready } = useAuth();
  // Сигнал оновлення з liveStore — зміна тригерить ефект (рефетч)
  const version = useLiveStore((s) => s.leaderboardVersion);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    getLeaderboard()
      .then((data) => {
        if (!cancelled) {
          setLeaders(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, version]);

  // loading лише до першого успішного/невдалого завантаження
  const loading = !ready || !loaded;

  return { leaders, loading };
}
