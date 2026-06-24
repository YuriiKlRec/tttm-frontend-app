/**
 * Хук для нескінченного завантаження сторінок із будь-яким типом елементів.
 *
 * Інтеграція з IntersectionObserver реалізована через sentinelRef —
 * розмістіть <div ref={sentinelRef} /> у кінці списку.
 *
 * Алгоритм:
 *   1. При монтуванні — завантажуємо першу сторінку.
 *   2. IntersectionObserver спостерігає за sentinel-елементом.
 *   3. Коли sentinel потрапляє у viewport — викликається loadMore.
 *   4. hasMore = items.length < total.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PageResult } from '../services/gameApi';

const PER_PAGE = 10;

/** Тип функції, що завантажує одну сторінку даних. */
type FetchPage<T> = (page: number) => Promise<PageResult<T>>;

/** Результат хука useInfiniteGames. */
export interface InfiniteGamesResult<T> {
  /** Накопичений список елементів з усіх завантажених сторінок. */
  items: T[];
  /** Чи є ще сторінки для завантаження. */
  hasMore: boolean;
  /** Чи виконується запит зараз. */
  loading: boolean;
  /** Завантажити наступну сторінку (викликається IntersectionObserver або вручну). */
  loadMore: () => void;
  /** Ref для sentinel-елемента; IntersectionObserver приєднується автоматично. */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Generically завантажує сторінки з бекенду та накопичує результати.
 *
 * @param fetchPage - функція, що приймає номер сторінки і повертає PageResult<T>
 * @param enabled   - якщо false, запити не виконуються (наприклад, до ініціалізації auth)
 * @returns items, hasMore, loading, loadMore, sentinelRef
 */
export function useInfiniteGames<T>(
  fetchPage: FetchPage<T>,
  enabled = true,
): InfiniteGamesResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  // Захист від паралельних запитів (StrictMode, подвійний mount, швидкий скрол)
  const isLoadingRef = useRef<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (pageNum: number) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setLoading(true);

      try {
        const result = await fetchPage(pageNum);
        setItems((prev) => (pageNum === 1 ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        setPage(pageNum);
      } catch (err) {
        // Помилка мережі — не скидаємо список, щоб не втратити завантажені дані
        console.error('[useInfiniteGames] Помилка завантаження сторінки:', err);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [fetchPage],
  );

  // Початкове завантаження і скидання стану при зміні fetchPage або enabled.
  // Коли enabled=false — пропускаємо запит, але скидаємо стан, щоб бути готовими.
  useEffect(() => {
    setItems([]);
    setTotal(0);
    setPage(1);
    if (!enabled) return;
    void loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, enabled]);

  const loadMore = useCallback(() => {
    // Не завантажуємо, якщо auth ще не готовий
    if (!enabled || isLoadingRef.current || items.length >= total) return;
    void loadPage(page + 1);
  }, [enabled, items.length, total, page, loadPage]);

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

    // Прибираємо спостерігач при розмонтуванні компонента або при зміні loadMore
    return () => observer.disconnect();
  }, [loadMore]);

  return {
    items,
    hasMore: items.length < total,
    loading,
    loadMore,
    sentinelRef,
  };
}

export { PER_PAGE };
