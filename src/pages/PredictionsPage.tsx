import { useCallback, type FC } from 'react'
import { Hero } from '../components/ui/Hero'
import { EmptyState } from '../components/ui/EmptyState'
import { GameCard } from '../components/games/GameCard'
import { useInfiniteGames, PER_PAGE } from '../hooks/useInfiniteGames'
import { useAuth } from '../hooks/useAuth'
import { listPredictions } from '../services/gameApi'

/** Вкладка Predictions: hero + список активних ігор із нескінченним скролом. */
const PredictionsPage: FC = () => {
  const { user, ready } = useAuth()
  const myUserId = user?.id ?? null

  // Мемоізуємо fetchPage через useCallback — щоб не скидати список при кожному рендері
  const fetchPage = useCallback(
    (page: number) => listPredictions(page, PER_PAGE, myUserId),
    // Залежимо від myUserId: при появі авторизації — перезавантажуємо список
    [myUserId],
  )

  // enabled=ready — не стартуємо запит до завершення ініціалізації auth.
  // refreshMs=30с — помірний фоновий refetch (лічильники ставок/призи ростуть
  // без ручного оновлення сторінки); WS-кімнати lobby на бекенді немає.
  const { items, loading, hasMore, sentinelRef } = useInfiniteGames(fetchPage, ready, 30_000)

  // Чекаємо ініціалізації AuthProvider — уникаємо помилкового EmptyState
  if (!ready) {
    return (
      <>
        <Hero />
        <div className="w-full" />
      </>
    )
  }

  return (
    <>
      <Hero />
      <div className="w-full">
        {items.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {items.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
            {/* Sentinel для IntersectionObserver — завантажує наступну сторінку при появі у viewport */}
            {hasMore && <div ref={sentinelRef} className="h-px" />}
          </div>
        )}
      </div>
    </>
  )
}

export default PredictionsPage
