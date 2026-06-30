import { useCallback, useMemo, type FC } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ResultCard } from '../components/games/ResultCard'
import { groupByDate } from '../utils/groupByDate'
import { useInfiniteGames, PER_PAGE } from '../hooks/useInfiniteGames'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n/useT'
import { useLocale } from '../i18n/locale'
import { listResults } from '../services/gameApi'

/**
 * Вкладка Results: список завершених ігор, ЗГРУПОВАНИЙ за датою фіналізації.
 * Використовує нескінченний скрол із IntersectionObserver-сентинелом.
 */
const ResultsPage: FC = () => {
  const { user, ready } = useAuth()
  const { t } = useT()
  const locale = useLocale()
  const myUserId = user?.id ?? null

  const fetchPage = useCallback(
    (page: number) => listResults(page, PER_PAGE, myUserId),
    [myUserId],
  )

  // enabled=ready — не стартуємо запит до завершення ініціалізації auth
  const { items, loading, hasMore, sentinelRef } = useInfiniteGames(fetchPage, ready)

  // groupByDate — чиста функція, тому useMemo дає нам оптимізацію при великих списках
  const groups = useMemo(
    () =>
      groupByDate(items, (game) => game.finishedAt, {
        locale,
        todayLabel: t('date.today'),
        yesterdayLabel: t('date.yesterday'),
      }),
    [items, locale, t],
  )

  // Чекаємо ініціалізації AuthProvider
  if (!ready) {
    return <div className="w-full" />
  }

  if (groups.length === 0 && !loading) {
    return (
      <div className="w-full">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="w-full space-y-10">
      {groups.map((group) => (
        <section key={group.key} className="space-y-4">
          <h2 className="text-center font-mono text-[13px] text-text-secondary">{group.label}</h2>
          <div className="space-y-8">
            {group.items.map((game) => (
              <ResultCard key={game.id} {...game} />
            ))}
          </div>
        </section>
      ))}
      {/* Sentinel для IntersectionObserver — завантажує наступну сторінку при появі у viewport */}
      {hasMore && <div ref={sentinelRef} className="h-px" />}
    </div>
  )
}

export default ResultsPage
