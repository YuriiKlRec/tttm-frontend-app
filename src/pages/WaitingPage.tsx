import { useCallback, type FC } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { CurrencyPricePlate } from '../components/games/CurrencyPricePlate'
import { WaitCard } from '../components/games/WaitCard'
import { useInfiniteGames, PER_PAGE } from '../hooks/useInfiniteGames'
import { useAuth } from '../hooks/useAuth'
import { listWaiting } from '../services/gameApi'

/** Поточний курс пари для плашки (мок; real-time ціна підключається окремо). */
const MOCK_PRICE = '$56,542.47'

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

  const { items, loading, hasMore, sentinelRef } = useInfiniteGames(fetchPage)

  return (
    <>
      <div className="sticky top-0 z-20 -mt-8 w-full bg-background px-3 pt-1.5 pb-3">
        <CurrencyPricePlate price={MOCK_PRICE} />
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
