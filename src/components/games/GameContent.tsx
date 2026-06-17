import type { FC } from 'react'
import type { Bet, DetailGroup, ViewMode } from '../../types/game'
import { PredictionsView } from './PredictionsView'
import { DetailsView } from './DetailsView'

/** Статистика гри для вигляду «Predictions». */
interface PredictionsStats {
  /** Призовий фонд. */
  reward: string
  /** Усі зайняті квитки. */
  ticketsTaken: string
  /** Квитки користувача. */
  ticketsMine: string
  /** Кількість гравців. */
  players: string
}

/** Пропси центральної області сторінки гри. */
interface GameContentProps {
  /** Поточний вид. */
  viewMode: ViewMode
  /** Ставки для вигляду «Predictions». */
  bets: Bet[]
  /** Статистика для вигляду «Predictions». */
  stats: PredictionsStats
  /** Групи інформації для вигляду «Details». */
  info: DetailGroup[]
  /** Поточна ціна для плашки курсу. */
  price: string
}

/**
 * Перемикач центральної області сторінки гри за `viewMode`:
 * chart → плейсхолдер, bets → Predictions, details → Details.
 */
export const GameContent: FC<GameContentProps> = ({ viewMode, bets, stats, info, price }) => {
  if (viewMode === 'bets') {
    return <PredictionsView bets={bets} stats={stats} price={price} />
  }

  if (viewMode === 'details') {
    return <DetailsView groups={info} price={price} />
  }

  return (
    <p className="flex h-full items-center justify-center font-mono text-[14px] text-text-secondary">
      {viewMode}
    </p>
  )
}
