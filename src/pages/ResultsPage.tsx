import { useMemo, type FC } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ResultCard } from '../components/games/ResultCard'
import { mockResults } from '../mocks/results'
import { groupByDate } from '../utils/groupByDate'

/**
 * Вкладка Results: список завершених ігор, ЗГРУПОВАНИЙ за датою фіналізації
 * (заголовок-дата по центру + картки під ним). Без hero та плашки курсу.
 * За відсутності ігор показує порожній стан.
 */
const ResultsPage: FC = () => {
  const groups = useMemo(
    () => groupByDate(mockResults, (game) => game.finishedAt),
    [],
  )

  if (groups.length === 0) {
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
    </div>
  )
}

export default ResultsPage
