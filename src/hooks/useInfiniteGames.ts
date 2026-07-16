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
 *
 * Опційний фоновий refresh (refreshMs):
 *   5. Кожні refreshMs мс перезавантажує ВСІ вже завантажені сторінки (1..page)
 *      і замінює items одним setState — оновлює лічильники/призи, підтягує нові ігри.
 *   6. Пауза, поки document.hidden; негайний refresh при поверненні видимості.
 *   7. isLoadingRef — спільний guard для loadMore і refresh: не дозволяє їм
 *      виконуватись одночасно (детальніше — коментар біля refresh нижче).
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
 * @param refreshMs - якщо задано, кожні refreshMs мс тихо перезавантажує вже
 *                    завантажені сторінки (пауза при document.hidden); за
 *                    замовчуванням вимкнено (undefined)
 * @returns items, hasMore, loading, loadMore, sentinelRef
 */
export function useInfiniteGames<T>(
  fetchPage: FetchPage<T>,
  enabled = true,
  refreshMs?: number,
): InfiniteGamesResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  // Захист від паралельних запитів (StrictMode, подвійний mount, швидкий скрол).
  // Той самий ref блокує і loadMore, і фоновий refresh — вони ніколи не виконуються
  // одночасно (див. коментар біля refresh).
  const isLoadingRef = useRef<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Номер останньої успішно завантаженої сторінки — для refresh (без items.length
  // у залежностях useCallback, щоб не перезбирати інтервал на кожен рендер)
  const pageRef = useRef<number>(1);
  // Позначає, що перша сторінка вже завантажена — до цього фоновий refresh не має сенсу
  const hasLoadedRef = useRef<boolean>(false);

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
        pageRef.current = pageNum;
        hasLoadedRef.current = true;
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
    pageRef.current = 1;
    hasLoadedRef.current = false;
    if (!enabled) return;
    void loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, enabled]);

  const loadMore = useCallback(() => {
    // Не завантажуємо, якщо auth ще не готовий, або якщо зараз триває
    // loadMore/початкове завантаження/фоновий refresh (isLoadingRef спільний)
    if (!enabled || isLoadingRef.current || items.length >= total) return;
    void loadPage(page + 1);
  }, [enabled, items.length, total, page, loadPage]);

  // ─── Фоновий refresh (опційно, вмикається через refreshMs) ────────────────
  //
  // Перезавантажує сторінки 1..pageRef.current ПАРАЛЕЛЬНО (Promise.all) і замінює
  // items ОДНИМ setState — без setLoading(true), тому UI не блимає (loading
  // призначений лише для першого завантаження й пагінації).
  //
  // Race з пагінацією: isLoadingRef — спільний guard з loadMore/loadPage.
  //   - Якщо триває loadMore/loadPage → refresh просто пропускає цей тік
  //     (isLoadingRef.current === true на вході) і спробує знову на наступному тіку.
  //   - Якщо стартував refresh → loadMore, викликаний під час нього (напр. користувач
  //     доскролив), теж бачить isLoadingRef.current === true і повертається без дії.
  //     Спеціального дочекування/скасування не потрібно: після завершення refresh
  //     items/total можуть змінитись → ідентичність loadMore зміниться → ефект
  //     IntersectionObserver нижче перестворить спостерігач і одразу перевірить
  //     поточну видимість sentinel (нативна поведінка observe() для вже видимого
  //     елемента), тобто пропущений loadMore фактично «повториться» сам.
  // Ніколи не чіпає items, якщо перша сторінка ще не завантажена (hasLoadedRef).
  const refresh = useCallback(async () => {
    if (!enabled || !hasLoadedRef.current || isLoadingRef.current) return;

    isLoadingRef.current = true;
    try {
      const pageNums = Array.from({ length: pageRef.current }, (_, i) => i + 1);
      const results = await Promise.all(pageNums.map((p) => fetchPage(p)));
      const merged = results.flatMap((r) => r.items);
      const lastTotal = results[results.length - 1]?.total ?? 0;
      setItems(merged);
      setTotal(lastTotal);
    } catch (err) {
      // Тиха помилка — список лишається як був, спробуємо на наступному тіку
      console.warn('[useInfiniteGames] Фоновий refresh не вдався:', err);
    } finally {
      isLoadingRef.current = false;
    }
  }, [enabled, fetchPage]);

  // Таймер фонового refresh: пауза при document.hidden, негайний refresh при
  // поверненні видимості (покриває сценарій «повернувся з покупки квитка»)
  useEffect(() => {
    if (!enabled || !refreshMs) return;

    const tick = (): void => {
      if (document.hidden) return;
      void refresh();
    };
    const intervalId = window.setInterval(tick, refreshMs);

    const handleVisibility = (): void => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, refreshMs, refresh]);

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
