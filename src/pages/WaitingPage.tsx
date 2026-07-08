import { useCallback, type FC } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { WaitCard } from '../components/games/WaitCard'
import { useInfiniteGames, PER_PAGE } from '../hooks/useInfiniteGames'
import { useAuth } from '../hooks/useAuth'
import { listWaiting } from '../services/gameApi'

/**
 * Вкладка Waiting: список ігор, що очікують фіналізації.
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

  return (
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
  )
}

export default WaitingPage
