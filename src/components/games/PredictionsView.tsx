import { useMemo, useState, type FC } from 'react'
import type { Bet } from '../../types/game'
import { PredictionStats } from './PredictionStats'
import { BetLine } from './BetLine'
import { CurrencyPricePlate } from './CurrencyPricePlate'
import sortIcon from '../../assets/icon-sort.svg'

/** Статистика гри для верхньої панелі. */
interface PredictionsStatsData {
  /** Призовий фонд. */
  reward: string
  /** Усі зайняті квитки. */
  ticketsTaken: string
  /** Квитки користувача. */
  ticketsMine: string
  /** Кількість гравців. */
  players: string
}

/** Пропси вигляду «Predictions». */
interface PredictionsViewProps {
  /** Список ставок. */
  bets: Bet[]
  /** Статистика гри. */
  stats: PredictionsStatsData
  /** Поточна ціна для плашки курсу. */
  price: string
}

/** Активний фільтр списку ставок. */
type Filter = 'all' | 'mine'

/**
 * Вигляд «Predictions»: фіксований верх (статистика + заголовок із фільтром),
 * скрол-список ставок та прикріплена внизу плашка курсу.
 * Фільтр перемикає показ усіх ставок або лише власних (variant === 'mine').
 */
export const PredictionsView: FC<PredictionsViewProps> = ({ bets, stats, price }) => {
  const [filter, setFilter] = useState<Filter>('all')

  const visibleBets = useMemo(
    () => (filter === 'mine' ? bets.filter((bet) => bet.variant === 'mine') : bets),
    [bets, filter],
  )

  return (
    <div className="relative flex h-full flex-col">
      <div className="bg-background">
        <PredictionStats {...stats} />

        <div className="flex items-center justify-between px-6">
          <h2 className="font-body text-[15px] font-bold text-text-primary">Tickets</h2>
          <button
            type="button"
            aria-label="Filter tickets"
            aria-pressed={filter === 'mine'}
            onClick={() => setFilter((prev) => (prev === 'all' ? 'mine' : 'all'))}
            className={`flex h-7 w-7 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              filter === 'mine' ? 'border border-text-focus bg-[rgba(239,151,35,0.15)]' : ''
            }`}
          >
            <img src={sortIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 h-px w-full bg-[rgba(255,255,255,0.25)]" aria-hidden="true" />
      </div>

      <div className="relative flex-1 overflow-y-auto scrollbar-hide">
        <ul className="space-y-5 px-6 pt-5 pb-12">
          {visibleBets.map((bet) => (
            <li key={`${bet.rank}-${bet.user}`}>
              <BetLine
                rank={bet.rank}
                user={bet.user}
                price={bet.price}
                variant={bet.variant}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute inset-x-0 bottom-2 mx-3">
        <CurrencyPricePlate price={price} />
      </div>
    </div>
  )
}
