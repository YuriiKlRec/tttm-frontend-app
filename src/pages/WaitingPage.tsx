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
 * Вкладка Waiting: закріплена плашка курсу BTC + список ігор, що очікують фіналізації.
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
      {/* Закріплена плашка курсу — sticky top, як StatusLine у AppLayout: не скролиться
          разом зі списком, лишається на тому самому місці одразу під ним.
          z-20 (не z-10): PixelCard-картки самі мають внутрішній z-10 на контенті
          (див. PixelCard.tsx) — за однакового z-index виграє порядок у DOM, і картка
          при скролі малювалась би поверх плашки. z-20 узгоджено з іншими "хедер"-подібними
          закріпленими елементами проєкту (GameHeader, BuyHeader, BetPanel — теж z-20 понад
          z-10 контентом карток). */}
      <div className="sticky top-0 z-20 -mt-8 w-full px-3 pt-1.5 pb-3">
        <CurrencyPricePlate price={priceStr} />
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
