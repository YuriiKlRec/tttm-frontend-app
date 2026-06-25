import { useCallback, type FC } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { CurrencyPricePlate } from '../components/games/CurrencyPricePlate'
import { WaitCard } from '../components/games/WaitCard'
import { useInfiniteGames, PER_PAGE } from '../hooks/useInfiniteGames'
import { useAuth } from '../hooks/useAuth'
import { useBinancePrice } from '../hooks/useBinancePrice'
import { listWaiting } from '../services/gameApi'
import { centsToUsd } from '../utils/units'

/**
 * Вкладка Waiting: плашка поточного курсу + список ігор, що очікують фіналізації.
 * Використовує нескінченний скрол із IntersectionObserver-сентинелом.
 */
const WaitingPage: FC = () => {
  const { user, ready } = useAuth()
  const myUserId = user?.id ?? null

  const fetchPage = useCallback(
    (page: number) => listWaiting(page, PER_PAGE, myUserId),
    [myUserId],
  )

  // enabled=ready — не стартуємо запит до завершення ініціалізації auth
  const { items, loading, hasMore, sentinelRef } = useInfiniteGames(fetchPage, ready)

  // Жива ціна BTC з Binance WebSocket; null — до першого тіку
  const livePrice = useBinancePrice()
  // Форматуємо аналогічно до GamePage (centsToUsd(Math.round(price*100)))
  const priceStr = livePrice !== null ? centsToUsd(Math.round(livePrice * 100)) : '—'

  return (
    <>
      {/* Без суцільної підкладки/sticky — плашка стоїть на сітці з відступами,
          як плашка онлайн-статусу (mx-3). */}
      <div className="-mt-8 w-full px-3 pt-1.5 pb-3">
        <CurrencyPricePlate price={priceStr} variant="online" />
      </div>
      <div className="w-full">
        {/* Чекаємо ініціалізації AuthProvider або першого завантаження — уникаємо flash EmptyState */}
        {(!ready || (loading && items.length === 0)) ? null : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {items.map((game) => (
              <WaitCard key={game.id} {...game} />
            ))}
            {/* Sentinel для IntersectionObserver — завантажує наступну сторінку при появі у viewport */}
            {hasMore && <div ref={sentinelRef} className="h-px" />}
          </div>
        )}
      </div>
    </>
  )
}

export default WaitingPage
