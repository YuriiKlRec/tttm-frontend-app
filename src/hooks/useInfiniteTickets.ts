/**
 * Хук для нескінченного завантаження тікетів однієї гри.
 *
 * Патерн: повністю аналогічний useInfiniteGames — IntersectionObserver через
 * sentinelRef, захист від паралельних запитів через isLoadingRef.
 *
 * Інтеграція з real-time: нові тікети з liveStore.ticketsByGame прилітають
 * окремо (через ingest → applyTicketAdded) і НЕ входять до цього списку.
 * GamePage об'єднує обидва джерела в масив bets (спочатку live, потім сторінки).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { listTickets } from '../services/ticketApi';
import type { Bet } from '../types/game';

const PER_PAGE = 20;

/** Результат хука useInfiniteTickets. */
export interface InfiniteTicketsResult {
  /** Накопичений список ставок з усіх завантажених сторінок. */
  bets: Bet[];
  /** Чи є ще сторінки для завантаження. */
  hasMore: boolean;
  /** Чи виконується запит зараз. */
  loading: boolean;
  /** Завантажити наступну сторінку. */
  loadMore: () => void;
  /** Ref для sentinel-елемента; IntersectionObserver приєднується автоматично. */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Завантажує тікети гри посторінково та накопичує результати.
 *
 * @param gameId   — ідентифікатор гри
 * @param mine     — фільтр «лише мої ставки»
 * @param myUserId — ID поточного користувача (для mine/win-логіки)
 * @param winningTicketId — ID переможного тікета (null → win=false)
 * @param enabled  — якщо false, запити не виконуються (до ініціалізації auth/game)
 */
export function useInfiniteTickets(
  gameId: string,
  mine: boolean,
  myUserId: string | null,
  winningTicketId: string | null | undefined,
  enabled = true,
): InfiniteTicketsResult {
  const [bets, setBets] = useState<Bet[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  // Захист від паралельних запитів
  const isLoadingRef = useRef<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (pageNum: number) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setLoading(true);

      try {
        const result = await listTickets(
          gameId,
          pageNum,
          PER_PAGE,
          mine,
          myUserId,
          winningTicketId,
        );
        setBets((prev) => (pageNum === 1 ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        setPage(pageNum);
      } catch (err) {
        // Помилка мережі — не скидаємо список
        console.error('[useInfiniteTickets] Помилка завантаження сторінки:', err);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [gameId, mine, myUserId, winningTicketId],
  );

  // Скидання та початкове завантаження при зміні параметрів або enabled
  useEffect(() => {
    setBets([]);
    setTotal(0);
    setPage(1);
    if (!enabled) return;
    void loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, mine, myUserId, winningTicketId, enabled]);

  const loadMore = useCallback(() => {
    if (!enabled || isLoadingRef.current || bets.length >= total) return;
    void loadPage(page + 1);
  }, [enabled, bets.length, total, page, loadPage]);

  // IntersectionObserver: автоматично викликає loadMore при появі sentinel у viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loadMore]);

  return {
    bets,
    hasMore: bets.length < total,
    loading,
    loadMore,
    sentinelRef,
  };
}
