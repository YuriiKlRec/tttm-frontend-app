/**
 * Хук для нескінченного завантаження тікетів однієї гри.
 *
 * Sentinel реалізовано через callback ref (а не useRef), щоб IntersectionObserver
 * перепідключався кожного разу, коли sentinel-вузол монтується/ремонтується
 * (наприклад, при перемиканні вкладок Details ↔ Predictions на GamePage).
 *
 * Захист від паралельних запитів — через isLoadingRef.
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
  /**
   * Callback ref для sentinel-елемента.
   * Призначається як `ref={sentinelRef}` — замінює попередній RefObject.
   * Observer автоматично підключається при монтуванні та відключається при
   * демонтуванні вузла.
   */
  sentinelRef: React.RefCallback<HTMLDivElement>;
}

/**
 * Повертає найближчий scrollable-предок вузла (overflowY auto|scroll),
 * або null якщо такого немає — тоді root IntersectionObserver буде viewport.
 */
function findScrollRoot(node: HTMLElement): Element | null {
  let el: HTMLElement | null = node.parentElement;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
    el = el.parentElement;
  }
  return null;
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
  // Внутрішній ref на IntersectionObserver — щоб можна було disconnect() при ремонті
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Ref на актуальний loadMore — оновлюється після кожного рендеру, щоб callback ref
  // залишався стабільним і не перебудовував observer при кожній зміні сторінки
  const loadMoreRef = useRef<() => void>(() => undefined);

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

  // Синхронізуємо ref щоразу, коли loadMore змінюється — без перебудови observer
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  /**
   * Callback ref для sentinel-елемента.
   * Викликається React при монтуванні (node !== null) та демонтуванні (node === null).
   * Кожного разу перепідключає IntersectionObserver до актуального DOM-вузла.
   * Стабільний між рендерами — залежностей немає.
   */
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    // Відключаємо попередній observer (якщо є)
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!node) return;

    // Знаходимо найближчий scrollable-предок як root observer
    const root = findScrollRoot(node);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreRef.current();
        }
      },
      { root, rootMargin: '200px' },
    );

    observerRef.current.observe(node);
  }, []);

  return {
    bets,
    hasMore: bets.length < total,
    loading,
    loadMore,
    sentinelRef,
  };
}
